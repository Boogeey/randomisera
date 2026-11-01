'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {renderListPages} = require('../scripts/list-pages.cjs');
const {parseDraft} = require('../assets/storage.js');
const {createWorkspaceState, resetRound} = require('../assets/workspace-state.js');
const {groupPlan, generateList} = require('../assets/draw-core.js');
const {randomInt, shuffle} = require('../assets/random.js');

test('all generated list pages match the single source template', () => {
  for (const [file, html] of renderListPages(path.resolve(__dirname, '..'))) assert.equal(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), html, 'Run npm run generate: ' + file);
});

test('old group-count drafts migrate without losing the meaning of their count', () => {
  const legacy = {version: 1, text: 'A\nB\nC\nD\nE\nF\nG\nH\nI\nJ', mode: 'groups', counts: {groups: 2}, unique: true};
  const draft = parseDraft(JSON.stringify(legacy));
  assert.equal(draft.grouping.method, 'groups');
  const result = generateList({mode: draft.mode, list: draft.text.split('\n'), count: draft.counts.groups, groupingMethod: draft.grouping.method});
  assert.equal(result.lines.length, 2);
  assert.equal(createWorkspaceState().groupingMethod, 'size');
  assert.equal(parseDraft(JSON.stringify({...legacy, grouping: {method: 'size', size: 3}})).grouping.size, 3);
  assert.equal(parseDraft(JSON.stringify({...legacy, grouping: {method: 'invalid', size: -2}})).grouping.method, 'groups');
});

test('round reset preserves settings and independent state instances do not share history', () => {
  const first = createWorkspaceState(), second = createWorkspaceState();
  first.groupSize = 3; first.drawn.add(0); first.resultHistory.push({text: 'A'}); first.lockedDice.add(0);
  resetRound(first);
  assert.equal(first.groupSize, 3); assert.equal(first.drawn.size, 0); assert.equal(first.resultHistory.length, 0); assert.equal(first.lockedDice.size, 0);
  first.resultHistory.push({text: 'B'}); assert.equal(second.resultHistory.length, 0);
});

test('group planning and generation agree for counts and maximum sizes', () => {
  for (let total = 1; total <= 50; total++) for (let value = 1; value <= 10; value++) {
    const plan = groupPlan(total, value, 'size');
    const result = generateList({mode: 'groups', count: value, list: Array.from({length: total}, (_, i) => String(i)), groupingMethod: 'size'}, () => 0);
    assert.equal(result.lines.length, plan.count);
    assert(result.lines.every(group => group.length <= value));
    assert.equal(new Set(result.lines.flat()).size, total);
  }
});

test('shared random utility validates bounds and shuffles without modifying input', () => {
  for (const n of [0, -1, 1.5, 4294967297]) assert.throws(() => randomInt(n));
  assert.equal(randomInt(1), 0);
  const source = ['A', 'B', 'C']; assert.deepEqual(shuffle(source, () => 0).sort(), source);
});
