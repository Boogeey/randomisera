'use strict';

function createWorkspaceState() {
  return {
    mode: '', decisionMode: 'coin',
    modeCounts: {choose: 1, groups: 2, numbers: 1},
    groupingMethod: 'size', groupSize: 4,
    drawn: new Set(), resultHistory: [], lastText: '', drawNumber: 0,
    diceValues: [], lockedDice: new Set()
  };
}

function resetRound(state) {
  state.diceValues = [];
  state.lockedDice.clear();
  state.drawNumber = 0;
  state.drawn.clear();
  state.resultHistory.length = 0;
  state.lastText = '';
}

module.exports = {createWorkspaceState, resetRound};
