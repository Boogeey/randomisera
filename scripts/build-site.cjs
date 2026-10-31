'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {transformSync} = require('esbuild');
const {minify} = require('html-minifier-terser');
async function minifyFile(file,data) {
  const extension=path.extname(file);
  const text=()=>data.toString('utf8').replace(/^\uFEFF/,'');
  if(extension==='.js'||extension==='.css')return Buffer.from(transformSync(text(),{loader:extension.slice(1),minify:true,charset:'utf8',legalComments:'inline',target:['safari15','chrome100','firefox100']}).code);
  if(extension==='.html'){
    const result=Buffer.from(await minify(text(),{collapseWhitespace:true,removeComments:true,removeRedundantAttributes:true,removeAttributeQuotes:false,removeOptionalTags:false,minifyJS:false,minifyCSS:false}));
    return result.length<data.length?result:data;
  }
  if(extension==='.webmanifest'||extension==='.json')return Buffer.from(JSON.stringify(JSON.parse(text())));
  return data;
}
async function build(root = path.resolve(__dirname,'..')) {
  root = fs.realpathSync(root);
  const template = fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const match = template.match(/const FILES = (\[[\s\S]*?\]);/);
  if (!match) throw Error('sw.js must define FILES as a JSON array.');
  const urls = JSON.parse(match[1]);
  if (!Array.isArray(urls) || !urls.length || urls.some(url=>typeof url!=='string')) throw Error('Invalid offline file list.');
  const files = urls.map(url => url.endsWith('/') ? url+'index.html' : url);
  const bytes = new Map();
  let sourceBytes=Buffer.byteLength(template);
  for (const file of files) {
    const resolved = path.resolve(root,file);
    if (!resolved.startsWith(root+path.sep) || !fs.realpathSync(resolved).startsWith(root+path.sep)) throw Error('Offline path escapes the site: '+file);
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) throw Error('Offline file is missing: '+file);
    const original=fs.readFileSync(resolved);sourceBytes+=original.length;
    bytes.set(file,await minifyFile(file,original));
  }
  const token='randomisera-offline-BUILD_HASH';
  const workerTemplate=(await minifyFile('sw.js',Buffer.from(template.replace(/const CACHE = '[^']+';/,"const CACHE = '"+token+"';")))).toString('utf8');
  if(!workerTemplate.includes(token))throw Error('Could not set cache placeholder.');
  const hash = crypto.createHash('sha256').update(workerTemplate);
  for (const file of [...bytes.keys()].sort()) hash.update('\0'+file+'\0').update(bytes.get(file));
  const cache = 'randomisera-offline-'+hash.digest('hex').slice(0,16);
  const worker = workerTemplate.replaceAll(token,cache);
  const output = path.resolve(root,'_site');
  // Only this verified, fixed build directory is removed, never the source root.
  if (output===root || path.dirname(output)!==root || path.basename(output)!=='_site') throw Error('Unsafe output directory.');
  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw Error('Build output must not be a symbolic link.');
  fs.rmSync(output,{recursive:true,force:true});
  fs.mkdirSync(output,{recursive:true});
  for (const [file,data] of bytes) {
    const target=path.resolve(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);
  }
  fs.writeFileSync(path.join(output,'sw.js'),worker);
  for (const file of ['CNAME','robots.txt','sitemap.xml','.nojekyll']) {
    if (fs.existsSync(path.join(root,file))) fs.copyFileSync(path.join(root,file),path.join(output,file));
  }
  const publishedBytes=[...bytes.values()].reduce((total,data)=>total+data.length,Buffer.byteLength(worker));
  return {output,cache,files:files.length,sourceBytes,publishedBytes,reduction:Math.round((1-publishedBytes/sourceBytes)*100)+'%'};
}
if (require.main===module) build().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={build};
