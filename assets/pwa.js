(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const $ = id => document.getElementById(id);
  const key = 'randomisera-pwa-preferences';
  const supported = window.isSecureContext && 'serviceWorker' in navigator && 'caches' in window;
  const display = window.matchMedia('(display-mode: standalone)');
  const standalone = () => display.matches || navigator.standalone === true;
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let prompt = null, installedHere = false, pending = null;
  let choice = null;
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (typeof stored?.offlineRequested === 'boolean') choice = stored.offlineRequested;
    // Remove the former installation guess; keep only an explicit offline choice.
    if (stored && Object.hasOwn(stored,'installed')) {
      if (choice === null) localStorage.removeItem(key);
      else localStorage.setItem(key,JSON.stringify({offlineRequested:choice}));
    }
  } catch { /* Storage restrictions must not prevent using or installing the app. */ }
  function remember(value) {
    choice = value;
    try { localStorage.setItem(key,JSON.stringify({offlineRequested:value})); } catch {}
  }
  function message(text='',kind='guide') {
    $('offline-status').className = text ? 'message message--'+kind : '';
    $('offline-status').textContent = text;
  }
  const mobile = apple || navigator.userAgentData?.mobile === true || /Android|Mobi/i.test(navigator.userAgent);
  function installUI() {
    $('install-toggle').textContent = mobile ? 'Lägg till på hemskärmen' : 'Lägg till som app';
    $('install-toggle').hidden = standalone() || installedHere;
    if (standalone() || installedHere) {
      $('install-panel').hidden = true;
      $('install-toggle').setAttribute('aria-expanded','false');
    }
    $('install-help').textContent = apple
      ? 'I Safari: tryck på Dela och välj Lägg till på hemskärmen. Välj Öppna som webbapp om det visas, och tryck på Lägg till.'
      : 'Öppna webbläsarens meny och välj Installera app eller Lägg till på startskärmen, om alternativet finns.';
  }
  function offlineUI(ready) {
    $('offline-settings').hidden = !(standalone() || choice !== null || ready);
    $('offline-info').textContent = ready ? 'Tillgänglig offline på den här enheten.' : 'Offlinefiler är inte sparade på den här enheten.';
    $('enable-offline').hidden = ready;
    $('disable-offline').hidden = !ready;
    $('enable-offline').disabled = !supported || !!pending;
    $('disable-offline').disabled = !!pending;
  }
  function workerRequest(worker,type,timeout=4000) {
    return new Promise((resolve,reject) => {
      const channel = new MessageChannel();
      const finish = (error,value) => { clearTimeout(timer);channel.port1.close();error?reject(error):resolve(value); };
      const timer = setTimeout(()=>finish(Error('Worker timeout')),timeout);
      channel.port1.onmessage = event => finish(null,event.data);
      try { worker.postMessage({type},[channel.port2]); } catch (error) { finish(error); }
    });
  }
  async function registration() {
    const reg = await navigator.serviceWorker.getRegistration(root.href);
    return reg?.scope === root.href ? reg : null;
  }
  async function legacyReady() {
    // Support a previously installed worker during the first upgrade to this flow.
    for (const name of await caches.keys()) {
      if (!/^randomisera-offline-v\d+$/.test(name)) continue;
      const cache = await caches.open(name);
      const core = ['./','assets/app.js','assets/style.css','manifest.webmanifest'];
      if ((await Promise.all(core.map(file=>cache.match(new URL(file,root).href)))).every(Boolean)) return true;
    }
    return false;
  }
  async function isReady(reg) {
    if (!reg?.active) return false;
    try { return (await workerRequest(reg.active,'OFFLINE_STATUS')).ready === true; }
    catch { return legacyReady(); }
  }
  function waitForActive(reg) {
    if (reg.active) return Promise.resolve();
    const worker = reg.installing || reg.waiting;
    if (!worker) return Promise.reject(Error('No worker'));
    return new Promise((resolve,reject) => {
      const finish = error => {clearTimeout(timer);worker.removeEventListener('statechange',check);error?reject(error):resolve();};
      const check = () => {if (reg.active) finish();else if (worker.state === 'redundant') finish(Error('Install failed'));};
      const timer = setTimeout(()=>finish(Error('Install timeout')),30000);
      worker.addEventListener('statechange',check);check();
    });
  }
  async function enableOffline() {
    if (!supported) { message('Offlinefunktionen kräver HTTPS och en webbläsare med stöd för offlinefiler.');return; }
    if (pending) return pending;
    pending = (async () => {
      $('enable-offline').disabled = $('disable-offline').disabled = true;
      message();$('offline-info').textContent = 'Förbereder offlinefiler…';
      try {
        const reg = await navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.href,updateViaCache:'none'});
        await waitForActive(reg);
        if (!await isReady(reg)) {
          const result = await workerRequest(reg.active,'PREPARE_OFFLINE',30000);
          if (!result.ready) throw Error('Preparation failed');
        }
        offlineUI(true);message();
      } catch {
        offlineUI(false);$('offline-settings').hidden=false;$('offline-settings').open=true;
        message('Offlinefunktionen kunde inte förberedas. Anslut till internet och försök igen.','error');
      }
    })().finally(()=>{pending=null;$('enable-offline').disabled=!supported;$('disable-offline').disabled=false;});
    return pending;
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;installUI();});
  window.addEventListener('appinstalled',()=>{installedHere=true;prompt=null;remember(true);installUI();void enableOffline();});
  display.addEventListener?.('change',()=>{installUI();if(standalone() && choice!==false){remember(true);void enableOffline();}});
  $('install-toggle').addEventListener('click',async()=>{
    if (prompt) {
      const current=prompt;prompt=null;
      try {
        await current.prompt();
        if ((await current.userChoice).outcome==='accepted') {remember(true);void enableOffline();}
      } catch {
        $('install-panel').hidden=false;$('install-toggle').setAttribute('aria-expanded','true');
      }
      return;
    }
    const open=$('install-panel').hidden;$('install-panel').hidden=!open;
    $('install-toggle').setAttribute('aria-expanded',String(open));
    if(open){remember(true);void enableOffline();}
  });
  $('enable-offline').addEventListener('click',()=>{remember(true);void enableOffline();});
  $('disable-offline').addEventListener('click',async()=>{
    if(pending)return;
    pending=(async()=>{
      $('enable-offline').disabled=$('disable-offline').disabled=true;
      try {
        const reg=await registration();if(reg)await reg.unregister();
        for(const name of await caches.keys())if(name.startsWith('randomisera-offline-'))await caches.delete(name);
        remember(false);offlineUI(false);
        message('Offlinefilerna är borttagna. Starta om appen för att avsluta offlineläget helt. Sparade listor finns kvar.');
      } catch {message('Offlinefilerna kunde inte tas bort. Försök igen.','error');}
    })().finally(()=>{pending=null;$('enable-offline').disabled=!supported;$('disable-offline').disabled=false;});
    await pending;
  });
  async function initialize() {
    installUI();offlineUI(false);
    if(!supported)return;
    if(standalone() && choice===null)remember(true);
    try {
      const reg=await registration();
      // Update checks run independently of rendering and never reload this page.
      if(reg){const check=()=>{void reg.update().catch(()=>{});};if(document.readyState==='complete')check();else window.addEventListener('load',check,{once:true});}
      const ready=await isReady(reg);offlineUI(ready);
      if(!ready && choice===true)void enableOffline();
    } catch {if(choice===true)void enableOffline();}
  }
  void initialize();
})();
