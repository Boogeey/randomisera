'use strict';
const {randomInt, shuffle} = require('./random.js');
class InputMessage extends Error {}

function groupPlan(total, value, method) {
  const count = method === 'size' ? Math.ceil(total / value) : value;
  return {count, size: Math.floor(total / count), larger: total % count};
}

function generateNumbers({count, min, max, unique}, integer = randomInt) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max || min < -1e9 || max > 1e9) {
    throw new InputMessage('Ange heltal mellan −1 miljard och 1 miljard. Från får inte vara större än till.');
  }
  const range = max - min + 1;
  if (!unique) return {lines: Array.from({length: count}, () => String(min + integer(range))), status: 'Slumpat och klart.'};
  if (count > range) throw new InputMessage('Det finns för få olika nummer. Minska antalet eller tillåt upprepningar.');
  const selected = new Set();
  for (let j = range - count; j < range; j++) {
    const value = integer(j + 1);
    selected.add(selected.has(value) ? j : value);
  }
  return {lines: shuffle([...selected], integer).map(value => String(value + min)), status: 'Slumpat och klart.'};
}

function generateList({mode, count, list, unique, drawn, groupingMethod}, integer = randomInt) {
  if (!list.length) throw new InputMessage('Skriv minst ett alternativ, ett per rad.');
  if (list.length > 10000) throw new InputMessage('Använd högst 10 000 rader åt gången.');
  if (mode === 'list') return {lines: shuffle(list, integer), status: 'Slumpat och klart.'};
  if (mode === 'groups') {
    count = groupPlan(list.length, count, groupingMethod).count;
    if (count > 1000) throw new InputMessage('Det blir fler än 1 000 grupper. Öka antalet personer per grupp.');
    if (count > list.length) throw new InputMessage('Antalet grupper får inte vara större än antalet personer.');
    const groups = Array.from({length: count}, () => []);
    shuffle(list, integer).forEach((value, i) => groups[i % count].push(value));
    return {lines: groups, status: `${list.length} personer i ${count} grupper.`};
  }
  if (!unique) return {lines: Array.from({length: count}, () => list[integer(list.length)]), status: 'Slumpat och klart.'};
  if (drawn.size === list.length) drawn.clear();
  const pool = list.map((value, index) => ({value, index})).filter(item => !drawn.has(item.index));
  if (drawn.size > 0 && count <= list.length) count = Math.min(count, pool.length);
  if (count > pool.length) throw new InputMessage(`Det finns ${pool.length} alternativ kvar. Välj färre eller återställ urvalet.`);
  const picks = shuffle(pool, integer).slice(0, count);
  picks.forEach(item => drawn.add(item.index));
  return {lines: picks.map(item => item.value), status: `${pool.length - count} av ${list.length} alternativ kvar.`};
}

function generateDecision({mode, count, sides, values, locked}, integer = randomInt) {
  if (mode !== 'dice') return {lines: [(mode === 'yes' ? ['Ja', 'Nej'] : ['Krona', 'Klave'])[integer(2)]], status: ''};
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new InputMessage('Välj ett heltal mellan 1 och 100 tärningar.');
  if (![4, 6, 8, 10, 12, 20, 100].includes(sides)) throw new InputMessage('Välj en giltig typ av tärning.');
  if (values.length !== count) locked.clear();
  const lines = Array.from({length: count}, (_, i) => locked.has(i) ? values[i] : String(1 + integer(sides)));
  return {lines, status: 'Summa: ' + lines.reduce((sum, value) => sum + Number(value), 0)};
}

function formatResult(lines, status, mode, decisionMode) {
  if (mode === 'groups') return lines.map((group, i) => 'Grupp ' + (i + 1) + '\n' + group.join('\n')).join('\n\n');
  if (mode === 'list') return lines.map((line, i) => (i + 1) + '. ' + line).join('\n');
  if (mode === 'decide' && decisionMode === 'dice') return lines.map((line, i) => 'Tärning ' + (i + 1) + ': ' + line).join('\n') + '\n' + status;
  return lines.join('\n');
}

module.exports = {InputMessage, groupPlan, generateNumbers, generateList, generateDecision, formatResult};
