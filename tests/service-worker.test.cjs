'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
function harness(){
  const events={},stores=new Map();let networkCalls=0,fail=false,claimed=false,published='A';
  const digest=body=>'sha256-'+require('node:crypto').createHash('sha256').update(body).digest('base64');
  const files=JSON.parse(source.match(/const FILES = (\[[\s\S]*?\]);/)[1]);
  const body=(release,url)=>'release:'+release+':'+url;
  const integrity=Object.fromEntries(files.map(file=>[file,digest(body('A',new URL(file,'https://example.com/app/').href))]));
  const network=async request=>{networkCalls++;if(fail)throw Error('offline');const text=body(published,request.url);if(request.integrity!==digest(text))throw Error('Integrity mismatch');return new Response(text)};
  const caches={async keys(){return [...stores.keys()]},async delete(name){return stores.delete(name)},async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {async match(url){return data.get(typeof url==='string'?url:url.url)?.clone()},async addAll(requests){const responses=await Promise.all(requests.map(async req=>[req.url,await network(req)]));for(const [url,response] of responses)data.set(url,response)}}}};
  const context=vm.createContext({URL,Request,Response,caches,self:{registration:{scope:'https://example.com/app/'},clients:{async claim(){claimed=true}},addEventListener(k,f){events[k]=f}},fetch:network});
  vm.runInContext(source.replace('const INTEGRITY = {};','const INTEGRITY = '+JSON.stringify(integrity)+';'),context);
  return {events,stores,get calls(){return networkCalls},set fail(v){fail=v},set published(v){published=v},get claimed(){return claimed},async lifecycle(type){let pending;events[type]({waitUntil(p){pending=p}});await pending},async request(url){let response;events.fetch({request:new Request(url),respondWith(p){response=p}});return response},async message(type){let pending,result;events.message({data:{type},ports:[{postMessage(v){result=v}}],waitUntil(p){pending=p}});await pending;return result}};
}
test('cached app responds without network, including index.html aliases and query strings',async()=>{const h=harness();await h.lifecycle('install');const calls=h.calls;h.fail=true;const response=await h.request('https://example.com/app/slumpa-lista/index.html?source=home');assert.match(await response.text(),/release:/);assert.equal(h.calls,calls);assert.equal(await h.request('https://elsewhere.example/'),undefined)});
test('complete-cache status, evicted-cache repair and own cache cleanup',async()=>{const h=harness();assert.equal((await h.message('OFFLINE_STATUS')).ready,false);await h.lifecycle('install');assert.equal((await h.message('OFFLINE_STATUS')).ready,true);const current=[...h.stores.keys()][0];h.stores.get(current).delete('https://example.com/app/assets/app.js');assert.equal((await h.message('OFFLINE_STATUS')).ready,false);assert.equal((await h.message('PREPARE_OFFLINE')).ready,true);h.stores.set('randomisera-offline-v1',new Map());h.stores.set('another-app',new Map());await h.lifecycle('activate');assert(h.claimed);assert(!h.stores.has('randomisera-offline-v1'));assert(h.stores.has('another-app'))});
test('failed new install does not delete the previous release',async()=>{const h=harness();h.stores.set('randomisera-offline-old',new Map([['old','keep']]));h.fail=true;await assert.rejects(h.lifecycle('install'));assert(h.stores.has('randomisera-offline-old'));assert.equal((await h.message('OFFLINE_STATUS')).ready,false)});

test('an evicted file cannot mix release B into cached HTML A or poison repair',async()=>{
  const h=harness();await h.lifecycle('install');const current=[...h.stores.keys()][0],cache=h.stores.get(current);
  const script='https://example.com/app/assets/app.js';cache.delete(script);h.published='B';
  assert.equal((await h.request(script)).status,503);
  assert.equal((await h.message('PREPARE_OFFLINE')).ready,false);
  assert.equal(cache.has(script),false);
  assert.match(await cache.get('https://example.com/app/').clone().text(),/^release:A:/);
  h.published='A';assert.equal((await h.message('PREPARE_OFFLINE')).ready,true);
  assert.match(await cache.get(script).clone().text(),/^release:A:/);
});

test('an incomplete install with mismatching content never reports offline ready',async()=>{
  const h=harness();h.published='B';await assert.rejects(h.lifecycle('install'),/Integrity/);
  assert.equal((await h.message('OFFLINE_STATUS')).ready,false);
  assert([...h.stores.values()].every(cache=>cache.size===0));
});
