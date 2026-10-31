'use strict';
const appRoot = new URL('../', document.currentScript.src);
const ui = id => document.getElementById(id);
function pwaMessage(text,kind='guide'){const element=ui('offline-status');element.className='message message--'+kind;element.textContent=text;}
let installPrompt = null;
const storageKey='randomisera-pwa-preferences';
function readPreferences(){try{return JSON.parse(localStorage.getItem(storageKey))||{};}catch{return {};}}
let preferences=readPreferences();
function remember(changes){preferences={...preferences,...changes};try{localStorage.setItem(storageKey,JSON.stringify(preferences));}catch{}}

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function updateInstall(){
  ui('install-app').hidden = !installPrompt || standalone();
  ui('install-help').hidden=standalone();
  ui('install-explanation').hidden=standalone();
  const installed=standalone()||preferences.installed===true;
  ui('install-toggle').hidden=installed;
  ui('app-settings').hidden=!installed;
  ui('install-help').textContent = standalone() ? 'Du använder Randomisera som app.' : installPrompt ? 'Installera Randomisera för snabb åtkomst från hemskärmen.' : apple ? 'Öppna sidan i Safari. Tryck på Dela och välj Lägg till på hemskärmen. Välj Öppna som webbapp om det visas och tryck på Lägg till.' : 'Öppna webbläsarens meny och välj Installera app eller Lägg till på startskärmen, om alternativet finns.';
}
window.addEventListener('beforeinstallprompt', event => {event.preventDefault();installPrompt=event;remember({installed:false});updateInstall();});
window.addEventListener('appinstalled',()=>{installPrompt=null;remember({installed:true});updateInstall();});
function togglePanel(){const open=ui('install-panel').hidden;ui('install-panel').hidden=!open;for(const id of ['install-toggle','app-settings'])ui(id).setAttribute('aria-expanded',String(open));}
ui('install-toggle').addEventListener('click',()=>{
  togglePanel();
  if(ui('install-panel').hidden)return;
  remember({offlineRequested:true});
  if(supported)enableOffline();
  if(installPrompt)ui('install-app').click();
});
ui('app-settings').addEventListener('click',togglePanel);
ui('install-app').addEventListener('click',async()=>{if(!installPrompt)return;const prompt=installPrompt;installPrompt=null;updateInstall();try{await prompt.prompt();await prompt.userChoice;}catch{ui('install-help').textContent='Använd webbläsarens meny för att lägga till appen.';}});
const supported = 'serviceWorker' in navigator && 'caches' in window && window.isSecureContext;
function offlineState(enabled){
  ui('enable-offline').hidden=enabled;
  ui('enable-offline').textContent='Aktivera offline';
  ui('disable-offline').hidden=!enabled;
}
async function cached(){
  for(const key of await caches.keys()){
    if(!key.startsWith('randomisera-offline-'))continue;
    const cache=await caches.open(key);
    if(await cache.match(new URL('manifest.webmanifest',appRoot).href))return true;
  }
  return false;
}
ui('enable-offline').disabled=!supported;
if(!supported)pwaMessage('Offlinefunktionen kräver HTTPS och en webbläsare med stöd för offlinefiler.');
let savingOffline=false;
async function enableOffline(){
  if(savingOffline)return; savingOffline=true;
  ui('enable-offline').disabled=true;pwaMessage('Sparar verktygets filer…');
  try{
    const registration=await navigator.serviceWorker.register(new URL('sw.js',appRoot),{scope:appRoot.href});
    const worker=registration.installing || registration.waiting || registration.active;
    if(worker && !['installed','activated'].includes(worker.state))await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('timeout')),30000);const check=()=>{if(['installed','activated'].includes(worker.state)){clearTimeout(timer);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);reject(Error('install'));}};worker.addEventListener('statechange',check);check();});
    if(!registration.active)await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('activation timeout')),30000);
      const check=()=>{if(registration.active){clearTimeout(timer);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);reject(Error('activation'));}};
      worker.addEventListener('statechange',check);check();
    });
    if(!await cached())throw Error('cache');offlineState(true);pwaMessage('Klart! Verktygen kan nu användas utan internet. Webbläsaren kan rensa filerna om lagringsutrymmet behövs.');
  }catch{ui('enable-offline').hidden=false;ui('enable-offline').textContent='Försök igen';pwaMessage('Kunde inte spara offlinefilerna. Kontrollera anslutningen och försök igen.','error');}
  finally{ui('enable-offline').disabled=false;savingOffline=false;}
}
ui('enable-offline').addEventListener('click',()=>{remember({offlineRequested:true});enableOffline();});
ui('disable-offline').addEventListener('click',async()=>{ui('disable-offline').disabled=true;try{const reg=await navigator.serviceWorker.getRegistration(appRoot.href);if(reg && reg.scope===appRoot.href)await reg.unregister();for(const key of await caches.keys())if(key.startsWith('randomisera-offline-'))await caches.delete(key);remember({offlineRequested:false});offlineState(false);pwaMessage('Offlinefilerna är borttagna. Starta om appen för att avsluta offlineläget helt.');}catch{pwaMessage('Kunde inte ta bort offlinefilerna. Försök igen.','error');}finally{ui('disable-offline').disabled=false;}});
if(standalone()){
  // Opening the installed app expresses the request for its advertised offline feature.
  if(preferences.offlineRequested!==false)remember({installed:true,offlineRequested:true});
  else remember({installed:true});
}
if(supported)cached().then(enabled=>{
  offlineState(enabled);
  if(enabled)pwaMessage('Offlinefiler finns sparade på den här enheten.');
  else if(preferences.offlineRequested===true)enableOffline();
}).catch(()=>{});
updateInstall();
