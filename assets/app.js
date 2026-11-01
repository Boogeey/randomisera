'use strict';

const $ = id => document.getElementById(id);
const listModes = ['choose', 'groups', 'list'];
const initialMode = document.body.dataset.mode || 'choose';
const isListTool = listModes.includes(initialMode);
const modeCounts = {choose: 1, groups: 2, numbers: 1};
const modes = {
  choose: {title: 'Låt slumpen avgöra', help: 'Välj en vinnare, kvällens film eller vem som börjar.', action: 'Välj slumpmässigt', label: 'Välj', count: 'Antal att välja'},
  groups: {title: 'Dela in i grupper', help: 'Dela in deltagare i lag, arbetsgrupper eller par.', action: 'Skapa grupper', label: 'Gruppera', count: 'Antal grupper'},
  list: {title: 'Blanda en lista', help: 'Slumpa en turordning, presentationsordning eller spellista.', action: 'Blanda listan', label: 'Blanda'},
  numbers: {title: 'Slumpa nummer', help: 'Välj ett intervall. Både det lägsta och högsta talet kan dras.', action: 'Slumpa nummer', label: 'Nummer', count: 'Antal nummer'},
  decide: {title: 'Låt slumpen avgöra'}
};
const decisionModes = {
  coin: {title: 'Singla slant', help: 'Avgör vem som börjar eller välj mellan två alternativ.', action: 'Singla slant', again: 'Singla igen', result: 'Slanten visar', origin: 'Krona eller klave', label: 'Slant'},
  yes: {title: 'Ja eller nej', help: 'Låt slumpen ge ett ja eller nej till en enkel fråga.', action: 'Slumpa ja eller nej', again: 'Slumpa igen', result: 'Slumpen valde', origin: 'Ja eller nej', label: 'Ja eller nej'},
  dice: {title: 'Kasta tärning', help: 'Kasta tärningar till sällskapsspel, rollspel eller egna lekar.', action: 'Kasta tärningarna', again: 'Kasta igen', result: 'Ditt kast', label: 'Tärning'}
};
const hashModes = {'#valj': 'choose', '#gruppera': 'groups', '#blanda': 'list'};
const modeHashes = {choose: '#valj', groups: '#gruppera', list: '#blanda'};
const decisionHashes = {coin: '#slant', yes: '#ja-eller-nej', dice: '#tarning'};
const resultHistory = [];
let mode = '', decisionMode = 'coin', drawn = new Set(), lastText = '';
let drawNumber = 0, resultAnimation = null;
let diceValues = [], diceButtons = [];
const lockedDice = new Set();

class InputMessage extends Error {}

function setDrawView(presentation, focus = false) {
  $('prepare-view').hidden = presentation;
  $('presentation-view').hidden = !presentation;
  document.body.dataset.view = presentation ? 'presentation' : 'prepare';
  if (!presentation) {
    diceValues = [];
    diceButtons = [];
    lockedDice.clear();
    if ($('dice-announcement')) $('dice-announcement').textContent = '';
    drawNumber = 0;
    resultAnimation?.cancel();
    resultAnimation = null;
    drawn.clear();
    resultHistory.length = 0;
    lastText = '';
    $('draw-counter').textContent = '';
    $('draw-announcement').textContent = '';
    $('output').replaceChildren();
    $('copy').disabled = true;
    $('status').textContent = 'Redo när du är.';
    $('history').open = false;
    renderHistory();
    if (mode === 'choose') $('submit').textContent = modes.choose.action;
    updateNextDraw();
  }
  if (focus) {
    document.activeElement?.blur();
    window.scrollTo({top: 0, behavior: 'instant'});
    const target = presentation ? 'next-draw' : 'main';
    if (!presentation) $('main').setAttribute('tabindex', '-1');
    $(target).focus({preventScroll: true});
  }
}

function clearResult() {
  $('error').hidden = true;
  setDrawView(false);
}

function selectMode(next) {
  if (!modes[next] || (isListTool ? !listModes.includes(next) : next !== initialMode)) return;
  if ($('count') && modeCounts[mode] !== undefined) modeCounts[mode] = $('count').value;
  mode = next;
  document.body.dataset.mode = mode;
  const config = modes[mode];
  $('title').textContent = config.title;
  if (config.help) $('help').textContent = config.help;
  if (config.action) $('submit').textContent = config.action;
  if ($('countFields')) {
    $('countFields').hidden = mode === 'list';
    $('count').disabled = mode === 'list';
    $('count').value = modeCounts[mode] || 1;
    $('countLabel').textContent = config.count || 'Antal att välja';
  }
  if ($('uniqueLabel')) $('uniqueLabel').hidden = mode === 'groups' || mode === 'list';
  for (const button of document.querySelectorAll('[data-list-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.listMode === mode));
  }
  clearResult();
}

function selectDecision(next) {
  if (!decisionModes[next]) return;
  decisionMode = next;
  document.body.dataset.decision = next;
  const dice = next === 'dice', config = decisionModes[next];
  $('dice-fields').hidden = !dice;
  $('dice-count').disabled = !dice;
  $('dice-sides').disabled = !dice;
  $('title').textContent = config.title;
  $('help').textContent = config.help;
  $('submit').textContent = config.action;
  for (const button of document.querySelectorAll('[data-decision-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.decisionMode === next));
  }
  clearResult();
}

function updateNextDraw() {
  const dice = mode === 'decide' && decisionMode === 'dice' && diceValues.length > 0;
  const allLocked = dice && lockedDice.size === diceValues.length;
  let label = mode === 'groups' ? 'Gör om grupperna' : mode === 'list' ? 'Blanda igen' : 'Slumpa igen';
  if (mode === 'decide') label = decisionModes[decisionMode].again;
  if (dice && lockedDice.size > 0) label = allLocked ? 'Alla tärningar är låsta' : 'Kasta olåsta';
  if (mode === 'choose' && $('unique').checked) {
    const total = entries().length, remaining = total - drawn.size, count = Number($('count').value);
    label = remaining === 0 && total > 0 ? 'Börja ny omgång'
      : remaining > 0 && remaining < count ? 'Välj sista (' + remaining + ')' : 'Välj nästa';
  }
  $('next-draw').textContent = label;
  $('next-draw').disabled = !!allLocked;
  if ($('unlock-dice')) $('unlock-dice').hidden = !dice || lockedDice.size === 0;
  if ($('dice-hint')) $('dice-hint').hidden = !dice;
}

function updateDiceButtons() {
  diceButtons.forEach((button, index) => {
    const locked = lockedDice.has(index);
    button.setAttribute('aria-pressed', String(locked));
    button.setAttribute('aria-label', `Tärning ${index + 1}: ${diceValues[index]}. ${locked ? 'Låst. Tryck för att låsa upp.' : 'Olåst. Tryck för att låsa.'}`);
  });
  updateNextDraw();
}

function toggleDie(index) {
  if (lockedDice.has(index)) lockedDice.delete(index);
  else lockedDice.add(index);
  updateDiceButtons();
  $('dice-announcement').textContent = `Tärning ${index + 1} ${lockedDice.has(index) ? 'låst' : 'upplåst'}, värde ${diceValues[index]}.`;
}

function unlockAllDice() {
  lockedDice.clear();
  updateDiceButtons();
  $('dice-announcement').textContent = 'Alla tärningar är upplåsta.';
  if (document.activeElement === $('unlock-dice')) $('next-draw').focus({preventScroll: true});
}

// Rejection sampling avoids bias when the interval does not divide 2^32.
function randomInt(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 4294967296) throw Error('Intervallet är för stort.');
  const value = new Uint32Array(1), limit = Math.floor(4294967296 / n) * n;
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % n;
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function entries() {
  return $('entries').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
}

function readCount() {
  const count = Number($('count').value);
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new InputMessage('Välj ett heltal mellan 1 och 1 000.');
  return count;
}

function generateNumbers() {
  const count = readCount(), min = Number($('min').value), max = Number($('max').value);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max || min < -1e9 || max > 1e9) {
    throw new InputMessage('Ange heltal mellan −1 miljard och 1 miljard. Från får inte vara större än till.');
  }
  const range = max - min + 1;
  if (!$('unique').checked) return {lines: Array.from({length: count}, () => String(min + randomInt(range))), status: 'Slumpat och klart.'};
  if (count > range) throw new InputMessage('Det finns för få olika nummer. Minska antalet eller tillåt upprepningar.');
  // Floyd's algorithm samples a small set without building the full interval.
  const selected = new Set();
  for (let j = range - count; j < range; j++) {
    const value = randomInt(j + 1);
    selected.add(selected.has(value) ? j : value);
  }
  return {lines: shuffle([...selected]).map(value => String(value + min)), status: 'Slumpat och klart.'};
}

function generateDecision() {
  if (decisionMode !== 'dice') {
    return {lines: [(decisionMode === 'yes' ? ['Ja', 'Nej'] : ['Krona', 'Klave'])[randomInt(2)]], status: ''};
  }
  const count = Number($('dice-count').value), sides = Number($('dice-sides').value);
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new InputMessage('Välj ett heltal mellan 1 och 100 tärningar.');
  if (![4, 6, 8, 10, 12, 20, 100].includes(sides)) throw new InputMessage('Välj en giltig typ av tärning.');
  if (diceValues.length !== count) lockedDice.clear();
  const lines = Array.from({length: count}, (_, index) => lockedDice.has(index) ? diceValues[index] : String(1 + randomInt(sides)));
  diceValues = lines;
  return {lines, status: 'Summa: ' + lines.reduce((sum, value) => sum + Number(value), 0)};
}

function generateList() {
  let count = mode === 'list' ? 0 : readCount();
  const list = entries();
  if (!list.length) throw new InputMessage('Skriv minst ett alternativ, ett per rad.');
  if (list.length > 10000) throw new InputMessage('Använd högst 10 000 rader åt gången.');
  if (mode === 'list') return {lines: shuffle(list), status: 'Slumpat och klart.'};
  if (mode === 'groups') {
    if (count > list.length) throw new InputMessage('Antalet grupper får inte vara större än antalet personer.');
    const groups = Array.from({length: count}, () => []);
    shuffle(list).forEach((value, i) => groups[i % count].push(value));
    return {lines: groups, status: `${list.length} personer i ${count} grupper.`};
  }
  if (!$('unique').checked) return {lines: Array.from({length: count}, () => list[randomInt(list.length)]), status: 'Slumpat och klart.'};
  if (drawn.size === list.length) drawn.clear();
  const pool = list.map((value, index) => ({value, index})).filter(item => !drawn.has(item.index));
  if (drawn.size > 0 && count <= list.length) count = Math.min(count, pool.length);
  if (count > pool.length) throw new InputMessage(`Det finns ${pool.length} alternativ kvar. Välj färre eller återställ urvalet.`);
  const picks = shuffle(pool).slice(0, count);
  picks.forEach(item => drawn.add(item.index));
  return {lines: picks.map(item => item.value), status: `${pool.length - count} av ${list.length} alternativ kvar.`};
}

function formatResult(lines, status) {
  if (mode === 'groups') return lines.map((group, i) => 'Grupp ' + (i + 1) + '\n' + group.join('\n')).join('\n\n');
  if (mode === 'list') return lines.map((line, i) => (i + 1) + '. ' + line).join('\n');
  if (mode === 'decide' && decisionMode === 'dice') return lines.map((line, i) => 'Tärning ' + (i + 1) + ': ' + line).join('\n') + '\n' + status;
  return lines.join('\n');
}

function renderResult(lines) {
  const dice = mode === 'decide' && decisionMode === 'dice';
  diceButtons = [];
  const result = document.createElement(mode === 'list' ? 'ol' : mode === 'groups' ? 'div' : 'ul');
  result.className = dice ? 'results dice-results' : 'results';
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
        button.addEventListener('click', () => toggleDie(index));
        diceButtons.push(button);
        item.append(button);
      } else item.textContent = line;
      result.append(item);
    }
  }
  $('output').replaceChildren(result);
  if (dice) updateDiceButtons();
}

function renderResultContext(lines) {
  if (mode === 'numbers') {
    $('result-title').textContent = lines.length === 1 ? 'Ditt nummer' : 'Dina nummer';
    $('presentation-origin').textContent = 'Från ' + $('min').value + ' till ' + $('max').value + ' · ' + lines.length + ' nummer';
  } else if (mode === 'decide') {
    const config = decisionModes[decisionMode];
    $('result-title').textContent = config.result;
    $('presentation-origin').textContent = decisionMode === 'dice'
      ? $('dice-count').value + (Number($('dice-count').value) === 1 ? ' tärning med ' : ' tärningar med ') + $('dice-sides').value + ' sidor' : config.origin;
  } else {
    $('result-title').textContent = mode === 'groups' ? 'Dina grupper' : mode === 'list' ? 'Din nya ordning' : 'Slumpen valde';
    const active = $('active-list-name');
    const name = active && !$('active-list').hidden ? active.textContent.replace(/^Hämtad lista: /, '') : 'Din lista';
    $('presentation-origin').textContent = name + ' · ' + entries().length + ' alternativ';
  }
  $('status').hidden = mode === 'numbers' || (mode === 'decide' && decisionMode !== 'dice');
}

function show(lines, status) {
  renderResult(lines);
  lastText = formatResult(lines, status);
  const label = mode === 'decide' ? decisionModes[decisionMode].label : modes[mode].label;
  resultHistory.push({text: lastText, label});
  renderHistory();
  $('copy').disabled = false;
  $('copy').textContent = 'Kopiera resultat';
  $('status').textContent = status;
  renderResultContext(lines);
  updateNextDraw();
  setDrawView(true, true);
  drawNumber++;
  $('draw-counter').textContent = 'Slumpning ' + drawNumber;
  $('draw-announcement').textContent = 'Slumpning ' + drawNumber + ': ' + lastText;
  resultAnimation?.cancel();
  resultAnimation = null;
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    const targets = mode === 'decide' && decisionMode === 'dice'
      ? diceButtons.filter((_, index) => !lockedDice.has(index)) : [$('output')];
    const animations = targets.filter(target => typeof target.animate === 'function')
      .map(target => target.animate([{opacity: 0.3}, {opacity: 1}], {duration: 240, easing: 'ease-out'}));
    resultAnimation = {cancel: () => animations.forEach(animation => animation.cancel())};
  }
}

function submitDraw(event) {
  event.preventDefault();
  if (mode === 'decide' && decisionMode === 'dice' && diceValues.length > 0 && lockedDice.size === diceValues.length) return;
  $('error').hidden = true;
  try {
    const result = mode === 'numbers' ? generateNumbers() : mode === 'decide' ? generateDecision() : generateList();
    show(result.lines, result.status);
  } catch (error) {
    setDrawView(false, true);
    const guidance = error instanceof InputMessage;
    $('error').className = 'message ' + (guidance ? 'message--guide' : 'message--error');
    $('error').setAttribute('role', guidance ? 'status' : 'alert');
    $('error').textContent = guidance ? error.message : 'Slumpningen kunde inte genomföras. Försök igen. Din inmatning finns kvar.';
    $('error').hidden = false;
  }
}

function historyText() {
  return resultHistory.map((entry, i) => entry.label + ' ' + (i + 1) + ':\n' + entry.text).join('\n\n');
}

function renderHistory() {
  const previous = resultHistory.slice(0, -1);
  $('history').hidden = previous.length === 0;
  $('history-title').textContent = 'Visa historik (' + previous.length + ')';
  const list = $('history-list');
  list.replaceChildren();
  list.start = previous.length;
  for (let i = previous.length - 1; i >= 0; i--) {
    const item = document.createElement('li');
    item.textContent = previous[i].label + ':\n' + previous[i].text;
    list.append(item);
  }
  $('copy-history').textContent = 'Kopiera alla';
}

async function copyText(text, button) {
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

$('form').addEventListener('submit', submitDraw);
for (const id of ['entries', 'unique']) $(id)?.addEventListener('input', clearResult);
$('count')?.addEventListener('input', updateNextDraw);
$('copy').addEventListener('click', () => copyText(lastText, $('copy')));
$('edit-draw').addEventListener('click', () => setDrawView(false, true));
$('next-draw').addEventListener('click', () => $('form').requestSubmit());
$('unlock-dice')?.addEventListener('click', unlockAllDice);
$('reset')?.addEventListener('click', () => { drawn.clear(); $('form').requestSubmit(); });
$('copy-history').addEventListener('click', () => copyText(historyText(), $('copy-history')));
$('clear-history').addEventListener('click', () => { resultHistory.length = 0; renderHistory(); });

function routeMode() {
  selectMode(isListTool ? hashModes[window.location.hash] || initialMode : initialMode);
}
routeMode();
if (isListTool) {
  for (const button of document.querySelectorAll('[data-list-mode]')) button.addEventListener('click', () => {
    const next = button.dataset.listMode;
    if (next === mode) return;
    window.history.pushState(null, '', modeHashes[next]);
    selectMode(next);
  });
  window.addEventListener('popstate', routeMode);
}
if (mode === 'decide') {
  const fromHash = () => Object.keys(decisionHashes).find(key => decisionHashes[key] === window.location.hash) || 'coin';
  selectDecision(fromHash());
  for (const button of document.querySelectorAll('[data-decision-mode]')) button.addEventListener('click', () => {
    const next = button.dataset.decisionMode;
    if (next === decisionMode) return;
    window.history.pushState(null, '', decisionHashes[next]);
    selectDecision(next);
  });
  window.addEventListener('popstate', () => selectDecision(fromHash()));
}
if (isListTool) {
  const updateCount = () => { $('entry-count').textContent = entries().length + ' alternativ'; };
  $('entries').addEventListener('input', updateCount);
  updateCount();
  const field = $('entries'), button = $('clear-entries');
  let clearedText = null, changing = false;
  function updateClearButton() {
    button.hidden = field.value.length === 0 && clearedText === null;
    button.textContent = clearedText !== null ? 'Ångra rensning' : 'Rensa';
  }
  field.addEventListener('input', () => { if (!changing) clearedText = null; updateClearButton(); });
  button.addEventListener('click', () => {
    if (clearedText !== null) { field.value = clearedText; clearedText = null; }
    else { clearedText = field.value; field.value = ''; }
    changing = true;
    try { field.dispatchEvent(new Event('input', {bubbles: true})); }
    finally { changing = false; }
    updateClearButton();
    field.focus();
  });
  window.addEventListener('pageshow', updateClearButton);
  updateClearButton();
}
