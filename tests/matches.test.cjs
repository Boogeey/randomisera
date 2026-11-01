'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const core = require('../assets/matches-core.js');
test('all bracket sizes give every team a path, no empty matches and exactly n-1 played matches', () => {
  for (let n=2;n<=32;n++) {
    const teams = Array.from({length:n}, (_,i) => 'Lag '+i), rounds = core.tournament(teams);
    assert.deepEqual(rounds[0].flatMap(match => match.teams).filter(x=>x!==null).sort(), teams.slice().sort());
    let played = 0;
    rounds.forEach((round,r) => round.forEach((_,m) => {
      const sides = core.sides(rounds,r,m);
      if (r===0 && sides.includes(null)) { assert(sides.some(x=>x!==null)); return; }
      assert(sides.every(x=>x!==null));
      core.win(rounds,r,m,sides[0]); played++;
    }));
    assert.equal(played,n-1);
    assert(teams.includes(core.advancing(rounds,rounds.length-1,0)));
  }
});
test('changing a winner clears only the affected future path and rejects unresolved matches', () => {
  const rounds = core.tournament(['a','b','c','d','e','f','g','h']);
  assert.throws(()=>core.win(rounds,1,0,'a'));
  rounds.forEach((round,r)=>round.forEach((_,m)=>core.win(rounds,r,m,core.sides(rounds,r,m)[0])));
  const untouched = rounds[1][1].winner;
  core.win(rounds,0,0,core.sides(rounds,0,0)[1]);
  assert.equal(rounds[1][0].winner,null); assert.equal(rounds[2][0].winner,null);
  assert.equal(rounds[1][1].winner,untouched);
  assert.throws(()=>core.win(rounds,0,0,'outsider'));
});
test('shuffle preserves participants without changing the input', () => {
  const input=['a','b','c','d'], result=core.shuffle(input,()=>0);
  assert.deepEqual(input,['a','b','c','d']); assert.deepEqual(result.slice().sort(),input); assert.notDeepEqual(result,input);
});
test('unsupported counts are rejected and match assets are included in the offline release', () => {
  assert.throws(()=>core.tournament(['a']));
  assert.throws(()=>core.tournament(Array.from({length:33},(_,i)=>String(i))));
  const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
  const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const file of ['assets/matches-core.js','assets/matches.js']) {
    assert(worker.includes(JSON.stringify(file)));
    assert(fs.existsSync(path.join(root,file.endsWith('/')?file+'index.html':file)));
  }
});
