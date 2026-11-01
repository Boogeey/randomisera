'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('footers contain only contact, privacy and App, with valid local links',()=>{
  for(const page of ['index.html','slumpa-namn/index.html','dela-in-i-grupper/index.html','slumpa-lista/index.html','slumpa-nummer/index.html','singla-slant/index.html','lagring-och-integritet/index.html','app/index.html']){
    const html=fs.readFileSync(path.join(root,page),'utf8'),footer=html.match(/<footer>([\s\S]*?)<\/footer>/)[1];
    assert.deepEqual([...footer.matchAll(/<a[^>]+>([^<]+)<\/a>/g)].map(match=>match[1]),['Kontakt','Lagring och integritet','App']);
    assert(!footer.includes('<button'));assert(!footer.includes('install-toggle'));
    for(const match of footer.matchAll(/href="([^"]+)"/g))if(!match[1].startsWith('mailto:'))assert(fs.existsSync(path.resolve(root,path.dirname(page),match[1])));
    if(page!=='app/index.html')assert(!html.includes('id="install-toggle"'));
  }
});
test('App page contains installation, manual instructions and offline controls and is packaged offline',()=>{
  const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
  for(const id of ['install-toggle','install-panel','install-help','offline-settings','offline-info','enable-offline','disable-offline','offline-status'])assert(html.includes('id="'+id+'"'));
  for(const label of ['iPhone och iPad','Android','Dator'])assert(html.includes('<summary>'+label+'</summary>'));
  assert(html.includes('src="../assets/pwa.js"'));assert(!html.includes('assets/app.js'));
  assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes('"app/"'));assert(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes('https://randomisera.se/app/'));
});
