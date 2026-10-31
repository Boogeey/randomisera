'use strict';
const appRoot = new URL('../', document.currentScript.src);
const ui = id => document.getElementById(id);
let installPrompt = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function updateInstall(){
  ui('install-app').hidden = !installPrompt || standalone();
  ui('install-toggle').textContent = standalone() ? 'Offlineinställningar' : 'Lägg till på hemskärmen';
  ui('install-help').textContent = standalone() ? 'Du använder Randomisera som app.' : installPrompt ? 'Installera Randomisera för snabb åtkomst från hemskärmen.' : apple ? 'Öppna sidan i Safari. Tryck på Dela och välj Lägg till på hemskärmen. Välj Öppna som webbapp om det visas och tryck på Lägg till.' : 'Öppna webbläsarens meny och välj Installera app eller Lägg till på startskärmen, om alternativet finns.';
}
window.addEventListener('beforeinstallprompt', event => {event.preventDefault();installPrompt=event;updateInstall();});
window.addEventListener('appinstalled',()=>{installPrompt=null;updateInstall();});
ui('install-toggle').addEventListener('click',()=>{const open=ui('install-panel').hidden;ui('install-panel').hidden=!open;ui('install-toggle').setAttribute('aria-expanded',String(open));});
ui('install-app').addEventListener('click',async()=>{if(!installPrompt)return;const prompt=installPrompt;installPrompt=null;updateInstall();try{await prompt.prompt();await prompt.userChoice;}catch{ui('install-help').textContent='Använd webbläsarens meny för att lägga till appen.';}});
const supported = 'serviceWorker' in navigator && 'caches' in window && window.isSecureContext;
function offlineState(enabled){ui('enable-offline').hidden=enabled;ui('disable-offline').hidden=!enabled;}
async function cached(){
  for(const key of await caches.keys()){
    if(!key.startsWith('randomisera-offline-'))continue;
    const cache=await caches.open(key);
    if(await cache.match(new URL('manifest.webmanifest',appRoot).href))return true;
  }
  return false;
}
ui('enable-offline').disabled=!supported;
if(!supported)ui('offline-status').textContent='Offlinefunktionen kräver HTTPS och en webbläsare med stöd för offlinefiler.';
ui('enable-offline').addEventListener('click',async()=>{
  ui('enable-offline').disabled=true;ui('offline-status').textContent='Sparar verktygets filer…';
  try{
    const registration=await navigator.serviceWorker.register(new URL('sw.js',appRoot),{scope:appRoot.href});
    const worker=registration.installing || registration.waiting || registration.active;
    if(worker && !['installed','activated'].includes(worker.state))await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('timeout')),30000);const check=()=>{if(['installed','activated'].includes(worker.state)){clearTimeout(timer);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);reject(Error('install'));}};worker.addEventListener('statechange',check);check();});
    if(!registration.active)await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('activation timeout')),30000);
      const check=()=>{if(registration.active){clearTimeout(timer);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);reject(Error('activation'));}};
      worker.addEventListener('statechange',check);check();
    });
    if(!await cached())throw Error('cache');offlineState(true);ui('offline-status').textContent='Klart! Verktygen kan nu användas utan internet. Webbläsaren kan rensa filerna om lagringsutrymmet behövs.';
  }catch{ui('offline-status').textContent='Kunde inte spara offlinefilerna. Kontrollera anslutningen och försök igen.';}
  finally{ui('enable-offline').disabled=false;}
});
ui('disable-offline').addEventListener('click',async()=>{ui('disable-offline').disabled=true;try{const reg=await navigator.serviceWorker.getRegistration(appRoot.href);if(reg && reg.scope===appRoot.href)await reg.unregister();for(const key of await caches.keys())if(key.startsWith('randomisera-offline-'))await caches.delete(key);offlineState(false);ui('offline-status').textContent='Offlinefilerna är borttagna. Starta om appen för att avsluta offlineläget helt.';}catch{ui('offline-status').textContent='Kunde inte ta bort offlinefilerna. Försök igen.';}finally{ui('disable-offline').disabled=false;}});
if(supported)cached().then(enabled=>{offlineState(enabled);if(enabled)ui('offline-status').textContent='Offlinefiler finns sparade på den här enheten.';}).catch(()=>{});
updateInstall();
