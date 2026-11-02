'use strict';
// One bounded layer, independent of the tournament state and draw randomness.
function createConfetti({document, window}) {
  let layer = null, lastBurst = -Infinity;
  const particles = new Set();
  const colors = ['#3E6950', '#D6A83E', '#B65B70', '#568DB0', '#8A70AD'];
  function clear() {
    for (const particle of particles) particle.animation.cancel();
    particles.clear();
    layer?.remove();
    layer = null;
    lastBurst = -Infinity;
  }
  function burst() {
    const now = Date.now();
    if (now - lastBurst < 100) return;
    lastBurst = now;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'confetti-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.append(layer);
    }
    for (let i = 0; i < 48 && particles.size < 240; i++) {
      const node = document.createElement('span');
      node.className = 'confetti-piece';
      node.style.left = Math.random() * 100 + '%';
      node.style.backgroundColor = colors[i % colors.length];
      if (reduced) node.style.top = (8 + Math.random() * 75) + '%';
      layer.append(node);
      const animation = node.animate(reduced ? [
        {opacity: 1}, {opacity: 0}
      ] : [
        {transform: 'translate3d(0,-20px,0) rotate(0deg)', opacity: 1},
        {transform: `translate3d(${Math.random() * 240 - 120}px,110vh,0) rotate(${Math.random() * 1080 - 540}deg)`, opacity: 0}
      ], {duration: reduced ? 650 : 1800 + Math.random() * 1400, easing: 'linear'});
      const particle = {animation};
      particles.add(particle);
      animation.onfinish = () => {
        particles.delete(particle);
        node.remove();
        if (!particles.size) { layer?.remove(); layer = null; }
      };
    }
  }
  return {burst, clear};
}
module.exports = {createConfetti};
