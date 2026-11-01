(() => {
  const loadAnalytics = () => {
    const script = document.createElement('script');
    script.type = 'module';
    script.async = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({token: 'ba84a07e993248f595c0cfa4495e0750'});
    document.body.appendChild(script);
  };
  const scheduleAnalytics = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadAnalytics, {timeout: 2000});
    } else {
      window.setTimeout(loadAnalytics, 0);
    }
  };
  if (document.readyState === 'complete') scheduleAnalytics();
  else window.addEventListener('load', scheduleAnalytics, {once: true});
})();
