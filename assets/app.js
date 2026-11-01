'use strict';
const core = require('./draw-core.js');
const {InputMessage} = core;
const {createWorkspaceState, resetRound} = require('./workspace-state.js');
const view = require('./result-view.js');
const {initTournament} = require('./matches.js');
const {initSavedLists} = require('./saved-lists.js');
const {createListStorage} = require('./storage.js');

const $ = id => document.getElementById(id);
const listModes = ['choose', 'groups', 'list'];
const initialMode = document.body.dataset.mode || 'choose';
const isListTool = listModes.includes(initialMode);
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
const state = createWorkspaceState();
let resultAnimation = null, diceButtons = [];
let savedLists = null;
const tournament = isListTool ? initTournament({document, window, navigator}) : null;



function setDrawView(presentation, focus = false) {
  $('prepare-view').hidden = presentation;
  $('presentation-view').hidden = !presentation;
  document.body.dataset.view = presentation ? 'presentation' : 'prepare';
  if (!presentation) {
    tournament?.reset();
    resetRound(state);
    diceButtons = [];
    if ($('dice-announcement')) $('dice-announcement').textContent = '';
    resultAnimation?.cancel();
    resultAnimation = null;
    $('draw-counter').textContent = '';
    $('draw-announcement').textContent = '';
    $('output').replaceChildren();
    $('copy').disabled = true;
    $('status').textContent = 'Redo när du är.';
    $('history').open = false;
    renderHistory();
    if (state.mode === 'choose') $('submit').textContent = modes.choose.action;
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
  updateGroupPreview();
}

function updateGroupPreview() {
  const preview = $('group-preview');
  if (!preview) return;
  const total = state.mode === 'groups' ? entries().length : 0;
  const value = Number($('count').value);
  const {count, size, larger} = core.groupPlan(total, value, state.groupingMethod);
  preview.hidden = !total || !Number.isInteger(value) || value < 1 || value > 1000;
  preview.textContent = '';
  if (preview.hidden) return;
  if (count > 1000) {
    preview.textContent = 'Det blir fler än 1 000 grupper. Öka antalet personer per grupp.';
    return;
  }
  if (count > total) {
    preview.textContent = `Lägg till ${count - total} namn för att få ${count} grupper.`;
    return;
  }
  const groupText = n => n === 1 ? '1 grupp' : `${n} grupper`;
  preview.textContent = larger
    ? `${groupText(larger)} med ${size + 1} deltagare och ${groupText(count - larger)} med ${size}.`
    : `${groupText(count)} med ${size} deltagare i varje.`;
}

function rememberCount() {
  if (!$('count')) return;
  if (state.mode === 'groups' && state.groupingMethod === 'size') state.groupSize = $('count').value;
  else if (state.modeCounts[state.mode] !== undefined) state.modeCounts[state.mode] = $('count').value;
}

function selectGroupingMethod(next) {
  if (!['groups', 'size'].includes(next)) return;
  rememberCount();
  state.groupingMethod = next;
  $('count').value = state.groupingMethod === 'size' ? state.groupSize : state.modeCounts.groups;
  $('countLabel').textContent = state.groupingMethod === 'size' ? 'Personer per grupp' : 'Antal grupper';
  clearResult();
}

function selectMode(next) {
  if (!modes[next] || (isListTool ? !listModes.includes(next) : next !== initialMode)) return;
  rememberCount();
  state.mode = next;
  document.body.dataset.mode = state.mode;
  const config = modes[state.mode];
  $('title').textContent = config.title;
  if (config.help) $('help').textContent = config.help;
  if (config.action) $('submit').textContent = config.action;
  if ($('countFields')) {
    $('countFields').hidden = state.mode === 'list';
    $('count').disabled = state.mode === 'list';
    $('count').value = state.modeCounts[state.mode] || 1;
    $('countLabel').textContent = config.count || 'Antal att välja';
    if (state.mode === 'groups' && state.groupingMethod === 'size') {
      $('count').value = state.groupSize;
      $('countLabel').textContent = 'Personer per grupp';
    }
  }
  if ($('group-method-field')) {
    $('group-method-field').hidden = state.mode !== 'groups';
    $('group-method').disabled = state.mode !== 'groups';
    $('group-method').value = state.groupingMethod;
  }
  if ($('uniqueLabel')) $('uniqueLabel').hidden = state.mode === 'groups' || state.mode === 'list';
  for (const button of document.querySelectorAll('[data-list-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.listMode === state.mode));
  }
  clearResult();
}

function selectDecision(next) {
  if (!decisionModes[next]) return;
  state.decisionMode = next;
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
  const dice = state.mode === 'decide' && state.decisionMode === 'dice' && state.diceValues.length > 0;
  const allLocked = dice && state.lockedDice.size === state.diceValues.length;
  let label = state.mode === 'groups' ? 'Gör om grupperna' : state.mode === 'list' ? 'Blanda igen' : 'Slumpa igen';
  if (state.mode === 'decide') label = decisionModes[state.decisionMode].again;
  if (dice && state.lockedDice.size > 0) label = allLocked ? 'Alla tärningar är låsta' : 'Kasta olåsta';
  if (state.mode === 'choose' && $('unique').checked) {
    const total = entries().length, remaining = total - state.drawn.size, count = Number($('count').value);
    label = remaining === 0 && total > 0 ? 'Börja ny omgång'
      : remaining > 0 && remaining < count ? 'Välj sista (' + remaining + ')' : 'Välj nästa';
  }
  $('next-draw').textContent = label;
  $('next-draw').disabled = !!allLocked;
  if ($('unlock-dice')) $('unlock-dice').hidden = !dice || state.lockedDice.size === 0;
  if ($('dice-hint')) $('dice-hint').hidden = !dice;
}

function updateDiceButtons() {
  diceButtons.forEach((button, index) => {
    const locked = state.lockedDice.has(index);
    button.setAttribute('aria-pressed', String(locked));
    button.setAttribute('aria-label', `Tärning ${index + 1}: ${state.diceValues[index]}. ${locked ? 'Låst. Tryck för att låsa upp.' : 'Olåst. Tryck för att låsa.'}`);
  });
  updateNextDraw();
}

function toggleDie(index) {
  if (state.lockedDice.has(index)) state.lockedDice.delete(index);
  else state.lockedDice.add(index);
  updateDiceButtons();
  $('dice-announcement').textContent = `Tärning ${index + 1} ${state.lockedDice.has(index) ? 'låst' : 'upplåst'}, värde ${state.diceValues[index]}.`;
}

function unlockAllDice() {
  state.lockedDice.clear();
  updateDiceButtons();
  $('dice-announcement').textContent = 'Alla tärningar är upplåsta.';
  if (document.activeElement === $('unlock-dice')) $('next-draw').focus({preventScroll: true});
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
  return core.generateNumbers({count: readCount(), min: Number($('min').value), max: Number($('max').value), unique: $('unique').checked});
}

function generateDecision() {
  const result = core.generateDecision({mode: state.decisionMode, count: Number($('dice-count')?.value), sides: Number($('dice-sides')?.value), values: state.diceValues, locked: state.lockedDice});
  if (state.decisionMode === 'dice') state.diceValues = result.lines;
  return result;
}

function generateList() {
  return core.generateList({mode: state.mode, count: state.mode === 'list' ? 0 : readCount(), list: entries(), unique: $('unique').checked, drawn: state.drawn, groupingMethod: state.groupingMethod});
}

function show(lines, status) {
  tournament?.setGroups(state.mode === 'groups' ? lines : []);
  diceButtons = view.renderResult(document, lines, {mode: state.mode, decisionMode: state.decisionMode, onToggleDie: toggleDie});
  if (state.mode === 'decide' && state.decisionMode === 'dice') updateDiceButtons();
  state.lastText = core.formatResult(lines, status, state.mode, state.decisionMode);
  const label = state.mode === 'decide' ? decisionModes[state.decisionMode].label : modes[state.mode].label;
  state.resultHistory.push({text: state.lastText, label});
  renderHistory();
  $('copy').disabled = false;
  $('copy').textContent = 'Kopiera resultat';
  $('status').textContent = status;
  view.renderResultContext(document, lines, {mode: state.mode, decisionMode: state.decisionMode, decisionModes, total: isListTool ? entries().length : 0, listName: savedLists?.getActiveName() || 'Din lista'});
  updateNextDraw();
  setDrawView(true, true);
  state.drawNumber++;
  $('draw-counter').textContent = 'Slumpning ' + state.drawNumber;
  $('draw-announcement').textContent = 'Slumpning ' + state.drawNumber + ': ' + state.lastText;
  resultAnimation?.cancel();
  resultAnimation = null;
  resultAnimation = view.animateResult({output: $('output'), mode: state.mode, decisionMode: state.decisionMode, diceButtons, lockedDice: state.lockedDice, reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches});
}

function submitDraw(event) {
  event.preventDefault();
  if (state.mode === 'decide' && state.decisionMode === 'dice' && state.diceValues.length > 0 && state.lockedDice.size === state.diceValues.length) return;
  $('error').hidden = true;
  try {
    const result = state.mode === 'numbers' ? generateNumbers() : state.mode === 'decide' ? generateDecision() : generateList();
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
  return state.resultHistory.map((entry, i) => entry.label + ' ' + (i + 1) + ':\n' + entry.text).join('\n\n');
}

function renderHistory() {
  const previous = state.resultHistory.slice(0, -1);
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

$('form').addEventListener('submit', submitDraw);
for (const id of ['entries', 'unique']) $(id)?.addEventListener('input', clearResult);
$('count')?.addEventListener('input', updateNextDraw);
$('count')?.addEventListener('input', updateGroupPreview);
$('group-method')?.addEventListener('change', () => selectGroupingMethod($('group-method').value));
$('copy').addEventListener('click', () => view.copyText(document, navigator, state.lastText, $('copy')));
$('edit-draw').addEventListener('click', () => setDrawView(false, true));
$('next-draw').addEventListener('click', () => $('form').requestSubmit());
$('unlock-dice')?.addEventListener('click', unlockAllDice);
$('reset')?.addEventListener('click', () => { state.drawn.clear(); $('form').requestSubmit(); });
$('copy-history').addEventListener('click', () => view.copyText(document, navigator, historyText(), $('copy-history')));
$('clear-history').addEventListener('click', () => { state.resultHistory.length = 0; renderHistory(); });

function routeMode() {
  selectMode(isListTool ? hashModes[window.location.hash] || initialMode : initialMode);
}
routeMode();
if (isListTool) {
  for (const button of document.querySelectorAll('[data-list-mode]')) button.addEventListener('click', () => {
    const next = button.dataset.listMode;
    if (next === state.mode) return;
    window.history.pushState(null, '', modeHashes[next]);
    selectMode(next);
  });
  window.addEventListener('popstate', routeMode);
}
if (state.mode === 'decide') {
  const fromHash = () => Object.keys(decisionHashes).find(key => decisionHashes[key] === window.location.hash) || 'coin';
  selectDecision(fromHash());
  for (const button of document.querySelectorAll('[data-decision-mode]')) button.addEventListener('click', () => {
    const next = button.dataset.decisionMode;
    if (next === state.decisionMode) return;
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

// The saved-list UI depends only on this explicit workspace contract.
if (isListTool) savedLists = initSavedLists({document, window,
  storage: createListStorage({
    local: {getItem: key => localStorage.getItem(key), setItem: (key,value) => localStorage.setItem(key,value)},
    session: {getItem: key => sessionStorage.getItem(key), setItem: (key,value) => sessionStorage.setItem(key,value)}
  }),
  workspace: {
    snapshot() { rememberCount(); return {text: $('entries').value, mode: state.mode, counts: {...state.modeCounts}, grouping: {method: state.groupingMethod, size: state.groupSize}, unique: $('unique').checked}; },
    restore(draft) {
      // Do not let selectMode() capture the pre-restoration input as a setting.
      state.mode = '';
      Object.assign(state.modeCounts, draft.counts);
      state.groupingMethod = draft.grouping.method;
      state.groupSize = draft.grouping.size;
      selectMode(hashModes[window.location.hash] || (initialMode === 'choose' ? draft.mode : initialMode));
      $('entries').value = draft.text;
      $('unique').checked = draft.unique;
    },
    reset: () => setDrawView(false)
  }
});
