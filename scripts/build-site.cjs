'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function build(root = path.resolve(__dirname,'..')) {
  root = fs.realpathSync(root);
  const template = fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const match = template.match(/const FILES = (\[[\s\S]*?\]);/);
  if (!match) throw Error('sw.js must define FILES as a JSON array.');
  const urls = JSON.parse(match[1]);
  if (!Array.isArray(urls) || !urls.length || urls.some(url=>typeof url!=='string')) throw Error('Invalid offline file list.');
  const files = urls.map(url => url.endsWith('/') ? url+'index.html' : url);
  const bytes = new Map();
  for (const file of files) {
    const resolved = path.resolve(root,file);
    if (!resolved.startsWith(root+path.sep) || !fs.realpathSync(resolved).startsWith(root+path.sep)) throw Error('Offline path escapes the site: '+file);
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) throw Error('Offline file is missing: '+file);
    bytes.set(file,fs.readFileSync(resolved));
  }
  const hash = crypto.createHash('sha256').update(template);
  for (const file of [...bytes.keys()].sort()) hash.update('\0'+file+'\0').update(bytes.get(file));
  const cache = 'randomisera-offline-'+hash.digest('hex').slice(0,16);
  const worker = template.replace(/const CACHE = '[^']+';/,"const CACHE = '"+cache+"';");
  if (worker===template) throw Error('Could not set generated cache ID.');
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
  return {output,cache,files:files.length};
}
if (require.main===module) console.log(JSON.stringify(build(),null,2));
module.exports={build};
