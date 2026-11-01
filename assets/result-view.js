'use strict';
const {toolLinks} = require('./tool-content.js');

function updateToolContent(document, content, key) {
  const $ = id => document.getElementById(id);
  const description = $('tool-description');
  if (!description || !content) return;
  description.hidden = false;
  $('use-cases-title').textContent = content.detailTitle;
  $('use-cases-paragraphs').replaceChildren(...content.paragraphs.map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }));
  $('related-tools').replaceChildren(...toolLinks.filter(tool => tool.key !== key).map(tool => {
    const link = document.createElement('a');
    link.href = (description.dataset.base || './') + tool.path + tool.fragment;
    link.textContent = tool.label;
    return link;
  }));
}

function renderResult(document, lines, {mode, decisionMode, diceSides, onToggleDie}) {
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
        if (Number(diceSides) === 6) {
          button.className = 'die-button die-button--six';
          const value = document.createElement('span');
          value.className = 'sr-only';
          value.textContent = line;
          button.append(value);
          const face = document.createElement('span');
          face.className = 'die-face';
          face.setAttribute('aria-hidden', 'true');
          const positions = {1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]};
          for (const position of positions[line]) {
            const pip = document.createElement('span');
            pip.className = 'die-pip';
            pip.style.gridArea = `${Math.ceil(position / 3)} / ${(position - 1) % 3 + 1}`;
            face.append(pip);
          }
          button.append(face);
        } else button.textContent = line;
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
    const stagger = mode === 'list' || mode === 'groups';
    const targets = stagger ? Array.from(output.children[0].children).slice(0, 20)
      : mode === 'decide' && decisionMode === 'dice'
      ? diceButtons.filter((_, index) => !lockedDice.has(index)) : [output];
    const animations = targets.filter(target => typeof target.animate === 'function')
      .map((target, index) => stagger
        ? target.animate([{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 280, delay: index * Math.min(65, 650 / Math.max(1, targets.length - 1)), easing: 'ease-out', fill: 'backwards'})
        : target.className === 'die-button die-button--six'
        ? target.animate([
          {transform: 'perspective(500px) translateY(-8px) rotateX(130deg) rotateY(-100deg) rotateZ(-150deg)', opacity: 0.5},
          {transform: 'perspective(500px) translateY(-14px) rotateX(-35deg) rotateY(40deg) rotateZ(35deg)', opacity: 1, offset: 0.55},
          {transform: 'perspective(500px) translateY(2px) rotateX(8deg) rotateY(-8deg) rotateZ(-6deg)', offset: 0.82},
          {transform: 'perspective(500px) translateY(0) rotateX(0) rotateY(0) rotateZ(0)'}
        ], {duration: 520, delay: Math.min(index * 25, 150), easing: 'ease-out', fill: 'backwards'})
        : target.animate([{opacity: 0.3}, {opacity: 1}], {duration: 240, easing: 'ease-out'}));
    return {cancel: () => animations.forEach(animation => animation.cancel())};
  }
  return null;
}

module.exports = {updateToolContent, renderResult, renderResultContext, copyText, animateResult};
