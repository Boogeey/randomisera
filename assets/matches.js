'use strict';
const core = require('./matches-core.js');
function initTournament({document, window, navigator}) {
  const $ = id => document.getElementById(id);
  let groups = [], schedule = [], position = 0;
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const members = team => team.members.join(', ');
  const roundName = round => {
    const count = schedule[round].length;
    return count === 1 ? 'Final' : count === 2 ? 'Semifinal' : count === 4 ? 'Kvartsfinal' : 'Omgång ' + (round + 1);
  };
  function matchCard(round, index, interactive) {
    const card = element('div', undefined, 'knockout-match');
    const teams = core.sides(schedule, round, index), winner = core.advancing(schedule, round, index);
    card.append(element('p', 'Match ' + (index + 1), 'note'));
    teams.forEach((team, side) => {
      const label = team?.name ?? (round === 0 ? 'Ingen motståndare' : 'Vinnare i match ' + (index * 2 + side + 1));
      const playable = interactive && teams.every(value => value !== null);
      const node = element(playable ? 'button' : 'div', label, 'match-team');
      if (playable) {
        node.type = 'button';
        node.setAttribute('aria-pressed', String(winner === team));
        node.setAttribute('aria-label', team.name + ': ' + members(team) + (winner === team ? ', vald vinnare' : ', välj som vinnare'));
        node.addEventListener('click', () => {
          core.win(schedule, round, index, team);
          render();
          $('match-output').querySelectorAll('.knockout-match')[index].querySelectorAll('button')[side].focus({preventScroll: true});
          $('match-announcement').textContent = team.name + (round === schedule.length - 1 ? ' vinner slutspelet.' : ' går vidare.');
        });
      }
      if (team !== null) node.append(element('span', members(team), 'team-members'));
      if (team !== null && team === winner) node.append(element('span', teams.includes(null) ? 'Går vidare utan match' : 'Vinnare', 'winner-label'));
      card.append(node);
    });
    return card;
  }
  function render() {
    $('match-output').replaceChildren();
    $('match-all').replaceChildren();
    $('match-title').textContent = roundName(position);
    $('match-counter').textContent = 'Omgång ' + (position + 1) + ' av ' + schedule.length;
    $('match-origin').textContent = groups.length + ' lag · Utslagsspel';
    schedule[position].forEach((_, index) => $('match-output').append(matchCard(position, index, true)));
    if (position === schedule.length - 1 && core.advancing(schedule, position, 0)) $('match-output').append(element('p', 'Vinnare: ' + core.advancing(schedule, position, 0).name, 'tournament-winner'));
    $('match-output').append(element('p', 'Välj vinnaren i varje match. Ändrar du en vinnare nollställs berörda matcher längre fram.', 'note match-guidance'));
    schedule.forEach((round, i) => {
      const section = element('section', undefined, 'schedule-round');
      section.append(element('h3', roundName(i)));
      round.forEach((_, index) => section.append(matchCard(i, index, false)));
      $('match-all').append(section);
    });
    $('match-prev').disabled = position === 0;
    $('match-next').disabled = position === schedule.length - 1;
    $('match-copy').textContent = 'Kopiera slutspel';
  }
  function move(delta) {
    position = Math.max(0, Math.min(schedule.length - 1, position + delta));
    render();
    $('match-title').focus({preventScroll: true});
    $('match-title').scrollIntoView({block: 'nearest'});
  }
  function reset() {
    groups = [];
    schedule = [];
    position = 0;
    $('tournament-start').hidden = true;
    $('tournament-start').textContent = 'Skapa slutspel med lagen';
    $('tournament-warning').hidden = true;
    $('match-presentation').hidden = true;
    $('match-output').replaceChildren();
    $('match-all').replaceChildren();
    $('match-announcement').textContent = '';
  }
  const api = {
    reset,
    setGroups(lines) {
      reset();
      groups = lines.map((members, index) => ({id: index, name: 'Lag ' + (index + 1), members: [...members]}));
      const available = groups.length >= 4 && groups.length <= 32;
      $('tournament-start').hidden = !available;
      $('tournament-warning').hidden = !available || new Set(groups.map(group => group.members.length)).size <= 1;
    }
  };
  $('tournament-start').addEventListener('click', () => {
    if (groups.length < 4 || groups.length > 32) return;
    if (!schedule.length) {
      schedule = core.tournament(core.shuffle(groups));
      position = 0;
      $('match-overview').open = false;
    }
    render();
    $('tournament-start').textContent = 'Fortsätt slutspelet';
    $('presentation-view').hidden = true;
    $('match-presentation').hidden = false;
    window.scrollTo({top: 0, behavior: 'instant'});
    $('match-title').focus({preventScroll: true});
  });
  $('match-back').addEventListener('click', () => {
    $('match-presentation').hidden = true;
    $('presentation-view').hidden = false;
    $('tournament-start').focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'instant'});
  });
  $('match-prev').addEventListener('click', () => move(-1));
  $('match-next').addEventListener('click', () => move(1));
  $('match-copy').addEventListener('click', async () => {
    const text = groups.map(group => group.name + ': ' + members(group)).join('\n') + '\n\n' + schedule.map((round, r) => roundName(r) + '\n' + round.map((_, i) => {
      const teams = core.sides(schedule, r, i), winner = core.advancing(schedule, r, i);
      return 'Match ' + (i + 1) + ': ' + teams.map((team, side) => team?.name ?? (r === 0 ? 'Ingen motståndare' : 'Vinnare i match ' + (i * 2 + side + 1))).join(' mot ') + (winner ? '\nVidare: ' + winner.name : '');
    }).join('\n')).join('\n\n');
    try { await navigator.clipboard.writeText(text); $('match-copy').textContent = 'Kopierat'; }
    catch { $('match-copy').textContent = 'Kopiera manuellt'; $('match-announcement').textContent = 'Kunde inte kopiera. Markera texten under Visa hela slutspelet och kopiera manuellt.'; $('match-overview').open = true; }
  });
  return api;
}
module.exports = {initTournament};
