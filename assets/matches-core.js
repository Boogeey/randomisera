'use strict';
const {shuffle} = require('./random.js');
function tournament(teams) {
  if (teams.length < 2 || teams.length > 32) throw Error('Ange mellan 2 och 32 lag för utslagsspel.');
  let seeds = [1, 2];
  while (seeds.length < teams.length) {
    const total = seeds.length * 2 + 1;
    seeds = seeds.flatMap(seed => [seed, total - seed]);
  }
  const rounds = [Array.from({length: seeds.length / 2}, (_, i) => ({
    teams: seeds.slice(i * 2, i * 2 + 2).map(seed => teams[seed - 1] ?? null), winner: null
  }))];
  while (rounds.at(-1).length > 1) rounds.push(Array.from({length: rounds.at(-1).length / 2}, () => ({winner: null})));
  return rounds;
}
function sides(rounds, round, match) {
  return round === 0 ? rounds[0][match].teams : [advancing(rounds, round - 1, match * 2), advancing(rounds, round - 1, match * 2 + 1)];
}
function advancing(rounds, round, match) {
  const teams = sides(rounds, round, match);
  if (round === 0 && teams.includes(null)) return teams.find(team => team !== null);
  return rounds[round][match].winner;
}
function win(rounds, round, match, team) {
  const teams = sides(rounds, round, match);
  if (teams.some(value => value === null) || !teams.includes(team)) throw Error('Matchen är inte klar att avgöras.');
  if (rounds[round][match].winner === team) return;
  rounds[round][match].winner = team;
  for (let next = round + 1, index = Math.floor(match / 2); next < rounds.length; next++, index = Math.floor(index / 2)) rounds[next][index].winner = null;
}
module.exports = {shuffle, tournament, sides, advancing, win};
