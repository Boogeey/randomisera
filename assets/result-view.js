'use strict';

function renderResult(document, lines, {mode, decisionMode, onToggleDie}) {
  const $ = id => document.getElementById(id);
  const dice = mode === 'decide' && decisionMode === 'dice';
  const diceButtons = [];
  const result = document.createElement(mode === 'list' ? 'ol' : mode === 'groups' ? 'div' : 'ul');
  result.className = dice ? 'results dice-results' : 'results';
  if (mode === 'list') {
    result.className = 'results order-results';
    result.setAttribute('role', 'list');
  }
  for (const [index, line] of lines.entries()) {
    if (mode === 'groups') {
      const group = document.createElement('section'), heading = document.createElement('h3'), members = document.createElement('ul');
      group.className = 'group-result';
      heading.textContent = 'Grupp ' + (index + 1);
      for (const name of line) { const item = document.createElement('li'); item.textContent = name; members.append(item); }
      group.append(heading, members);
      result.append(group);
    } else {
      const item = document.createElement('li');
      if (dice) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'die-button';
        button.textContent = line;
        button.addEventListener('click', () => onToggleDie(index));
        diceButtons.push(button);
        item.append(button);
      } else item.textContent = line;
      result.append(item);
    }
  }
  $('output').replaceChildren(result);
  return diceButtons;
}

function renderResultContext(document, lines, {mode, decisionMode, decisionModes, total, listName}) {
  const $ = id => document.getElementById(id);
  if (mode === 'numbers') {
    $('result-title').textContent = lines.length === 1 ? 'Ditt nummer' : 'Dina nummer';
    $('presentation-origin').textContent = 'Från ' + $('min').value + ' till ' + $('max').value + ' · ' + lines.length + ' nummer';
  } else if (mode === 'decide') {
    const config = decisionModes[decisionMode];
    $('result-title').textContent = config.result;
    $('presentation-origin').textContent = decisionMode === 'dice'
      ? $('dice-count').value + (Number($('dice-count').value) === 1 ? ' tärning med ' : ' tärningar med ') + $('dice-sides').value + ' sidor' : config.origin;
  } else {
    $('result-title').textContent = mode === 'groups' ? 'Dina grupper' : mode === 'list' ? 'Din turordning' : 'Slumpen valde';
    $('presentation-origin').textContent = listName + ' · ' + total + ' alternativ';
  }
  $('status').hidden = mode === 'numbers' || mode === 'list' || (mode === 'decide' && decisionMode !== 'dice');
}

async function copyText(document, navigator, text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Kopierat!';
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    button.textContent = copied ? 'Kopierat!' : 'Kunde inte kopiera';
  }
}


function animateResult({output, mode, decisionMode, diceButtons, lockedDice, reducedMotion}) {
  if (!reducedMotion) {
    // Animate the first screenfuls; long lists stay responsive and immediately usable.
    const order = mode === 'list';
    const targets = order ? Array.from(output.children[0].children).slice(0, 20)
      : mode === 'decide' && decisionMode === 'dice'
      ? diceButtons.filter((_, index) => !lockedDice.has(index)) : [output];
    const animations = targets.filter(target => typeof target.animate === 'function')
      .map((target, index) => order
        ? target.animate([{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 280, delay: index * Math.min(65, 650 / Math.max(1, targets.length - 1)), easing: 'ease-out', fill: 'backwards'})
        : target.animate([{opacity: 0.3}, {opacity: 1}], {duration: 240, easing: 'ease-out'}));
    return {cancel: () => animations.forEach(animation => animation.cancel())};
  }
  return null;
}

module.exports = {renderResult, renderResultContext, copyText, animateResult};
