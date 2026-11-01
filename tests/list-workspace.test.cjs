'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');

function harness(initial='choose',hash='',draftStore=null,savedStore=new Map(),blocked=false,reducedMotion=false,groupMethod='groups'){
  const nodes={},windowEvents={};
  function element(tag='div'){
    return {tag,children:[],animations:[],dataset:{},value:'',maxLength:100000,hidden:false,disabled:false,checked:true,textContent:'',listeners:{},
      animate(frames,options){const animation={frames,options,canceled:false,cancel(){this.canceled=true;}};this.animations.push(animation);return animation;},
      style:{},
      querySelectorAll(selector){const found=[];const visit=node=>{for(const child of node.children||[]){if(selector==='button'?child.tag==='button':selector==='.knockout-match'&&child.className==='knockout-match')found.push(child);visit(child);}};visit(this);return found;},
      setAttribute(k,v){this[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},
      addEventListener(k,f){(this.listeners[k]??=[]).push(f);},dispatchEvent(e){for(const f of this.listeners[e.type]||[])f(e);},
      click(){this.dispatchEvent({type:'click'});},requestSubmit(){this.dispatchEvent({type:'submit',preventDefault(){}});},focus(){}};
  }
  for(const id of [...fs.readFileSync(path.join(root,initial==='decide'?'singla-slant/index.html':initial==='numbers'?'slumpa-nummer/index.html':'index.html'),'utf8').matchAll(/id="([^"]+)"/g)].map(x=>x[1]))nodes[id]=element();
  for(const [id,value] of [['count','1'],['min','1'],['max','100']])if(nodes[id])nodes[id].value=value;
  const buttons=(initial==='decide'||initial==='numbers'?[]:['choose','groups','list']).map(mode=>{const b=element('button');b.dataset.listMode=mode;return b;});
  const decisionButtons=(initial==='decide'?['coin','yes','dice']:[]).map(mode=>{const b=nodes['decision-'+mode];b.dataset.decisionMode=mode;return b;});
  if(initial==='decide'){nodes['dice-count'].value='1';nodes['dice-sides'].value='6';}
  const body=element('body');body.dataset.mode=initial;
  const window={location:{hash},confirm:()=>true,matchMedia:()=>({matches:reducedMotion}),history:{pushState(_,__,value){window.location.hash=value;}},addEventListener(k,f){windowEvents[k]=f;},scrollTo(){}};
  const storage=store=>({getItem(key){if(blocked)throw Error('blocked');return store.get(key)??null;},setItem(key,value){if(blocked)throw Error('blocked');store.set(key,value);}});
  const queryAll=selector=>selector==='[data-decision-mode]'?decisionButtons:selector==='[data-list-mode]'?buttons:[];
  const context=vm.createContext({document:{body,getElementById:id=>nodes[id]||null,createElement:element,querySelectorAll:queryAll},window,sessionStorage:storage(draftStore||new Map()),localStorage:storage(savedStore),crypto:require('node:crypto').webcrypto,Event:class{constructor(type){this.type=type;}}});
  vm.runInContext(code,context);
  // Existing group-count scenarios explicitly select that method.
  if(nodes['group-method']&&groupMethod){nodes['group-method'].value=groupMethod;if(vm.runInContext('mode',context)==='groups')nodes['group-method'].dispatchEvent({type:'change'});else vm.runInContext('groupingMethod='+JSON.stringify(groupMethod),context);}
  if(draftStore)vm.runInContext(fs.readFileSync(path.join(root,'assets/saved-lists.js'),'utf8'),context);
  const input=text=>{nodes.entries.value=text;nodes.entries.dispatchEvent({type:'input'});};
  const switchTo=mode=>buttons.find(b=>b.dataset.listMode===mode).click();
  const submit=()=>nodes.form.dispatchEvent({type:'submit',preventDefault(){}});
  return {nodes,buttons,decisionButtons,window,windowEvents,input,switchTo,submit,run:s=>vm.runInContext(s,context)};
}

test('one list and count settings survive mode changes while previous rounds reset',()=>{
  const h=harness();h.input('Alex\nKim\nSam\nRobin');h.nodes.count.value='2';h.submit();
  h.switchTo('groups');assert.equal(h.nodes.entries.value,'Alex\nKim\nSam\nRobin');assert.equal(h.nodes.count.value,2);
  h.nodes.count.value='3';h.submit();assert.deepEqual(Array.from(h.nodes.output.children[0].children,g=>g.children[1].children.length),[2,1,1]);
  h.switchTo('list');assert(h.nodes.count.disabled);h.submit();assert.equal(h.nodes.output.children[0].tag,'ol');assert.equal(h.nodes.output.children[0].children.length,4);
  h.switchTo('choose');assert.equal(h.nodes.count.value,'2');assert.equal(h.run('drawn.size'),0);assert.equal(h.run('resultHistory.length'),0);
  h.submit();assert.equal(h.run('drawn.size'),2);assert.equal(h.run('resultHistory.length'),1);
  h.nodes.reset.click();h.submit();assert.equal(h.nodes.entries.value,'Alex\nKim\nSam\nRobin');assert(h.nodes.error.hidden);
  h.switchTo('groups');assert.equal(h.nodes.count.value,'3');
});

test('same-tab navigation restores raw input, mode and settings but never draw history',()=>{
  const draft=new Map();const h=harness('choose','',draft);
  h.input('Alex\nAlex\n Kim \n');h.nodes.count.value='2';h.nodes.count.dispatchEvent({type:'input'});
  h.nodes.unique.checked=false;h.nodes.unique.dispatchEvent({type:'input'});h.switchTo('groups');h.nodes.count.value='3';h.nodes.count.dispatchEvent({type:'input'});h.switchTo('list');
  h.submit();h.windowEvents.pagehide();
  const restored=harness('choose','',draft);assert.equal(restored.nodes.entries.value,'Alex\nAlex\n Kim \n');assert.equal(restored.run('mode'),'list');assert.equal(Number(restored.run('modeCounts.choose')),2);assert.equal(Number(restored.run('modeCounts.groups')),3);assert.equal(restored.nodes.unique.checked,false);
  assert.equal(restored.run('drawn.size'),0);assert.equal(restored.run('resultHistory.length'),0);assert(!restored.nodes['prepare-view'].hidden);
  restored.nodes['clear-entries'].click();const cleared=harness('choose','',draft);assert.equal(cleared.nodes.entries.value,'');
  restored.nodes['clear-entries'].click();assert.equal(harness('choose','',draft).nodes.entries.value,'Alex\nAlex\n Kim \n');
  assert.equal(harness('groups','',draft).run('mode'),'groups');assert.equal(harness('choose','#valj',draft).run('mode'),'choose');
});

test('a restored loaded list retains unsaved changes and its original saved baseline',()=>{
  const draft=new Map(),saved=new Map();saved.set('randomisera-saved-lists-v1',JSON.stringify({version:1,lists:[{name:'Team',entries:['Alex','Kim']}]}));
  const h=harness('choose','',draft,saved);h.nodes['open-lists'].click();h.nodes['saved-list-items'].children[0].children[1].children[0].click();
  h.input('Alex\nKim\nLo');h.windowEvents.pagehide();const restored=harness('choose','',draft,saved);
  assert.equal(restored.nodes.entries.value,'Alex\nKim\nLo');assert.equal(restored.nodes['active-list-name'].textContent,'Hämtad lista: Team');assert(!restored.nodes['update-list'].disabled);
  assert.deepEqual(JSON.parse(saved.get('randomisera-saved-lists-v1')).lists[0].entries,['Alex','Kim']);
  restored.nodes['update-list'].click();assert.deepEqual(JSON.parse(saved.get('randomisera-saved-lists-v1')).lists[0].entries,['Alex','Kim','Lo']);
});

test('blocked or malformed session storage does not prevent normal draws',()=>{
  const key='randomisera-list-draft-v1';
  for(const [draft,blocked] of [[new Map(),true],[new Map([[key,'broken json']]),false],[new Map([[key,JSON.stringify({version:1,text:42})]]),false]]){
    const h=harness('choose','',draft,new Map(),blocked);h.input('A\nB');h.submit();assert(h.nodes.error.hidden);assert.equal(h.run('drawn.size'),1);
  }
});

test('clear and undo restore input and counts without saving or deleting lists',()=>{
  const h=harness();h.input('A\nA\nB');assert.equal(h.nodes['entry-count'].textContent,'3 alternativ');
  h.nodes['clear-entries'].click();assert.equal(h.nodes.entries.value,'');assert.equal(h.nodes['entry-count'].textContent,'0 alternativ');assert.equal(h.nodes['clear-entries'].textContent,'Ångra rensning');
  h.switchTo('groups');h.nodes['clear-entries'].click();assert.equal(h.nodes.entries.value,'A\nA\nB');assert.equal(h.nodes['entry-count'].textContent,'3 alternativ');
});

test('identical rows remain separate choices in every list mode',()=>{
  for(const mode of ['choose','groups','list']){
    const h=harness(mode);h.input('Alex\nAlex\nKim');h.nodes.count.value=mode==='groups'?'2':'3';h.submit();
    assert(h.nodes.error.hidden);
    const text=h.run('lastText');assert.equal((text.match(/Alex/g)||[]).length,2);assert.equal((text.match(/Kim/g)||[]).length,1);
    if(mode==='choose'){assert.equal(h.run('drawn.size'),3);assert.equal(h.nodes['next-draw'].textContent,'Börja ny omgång');}
  }
});

test('legacy routes, fragment navigation and browser Back select the correct mode',()=>{
  for(const mode of ['choose','groups','list']){const h=harness(mode);assert.equal(h.run('mode'),mode);assert.equal(h.nodes.count.value,mode==='groups'?2:1);}
  const h=harness('choose','#blanda');assert.equal(h.run('mode'),'list');h.input('A\nB');h.switchTo('groups');assert.equal(h.window.location.hash,'#gruppera');
  h.window.location.hash='#blanda';h.windowEvents.popstate();assert.equal(h.run('mode'),'list');assert.equal(h.nodes.entries.value,'A\nB');
  const numbers=harness('numbers','#blanda');assert.equal(numbers.run('mode'),'numbers');numbers.submit();assert(numbers.nodes.error.hidden);
  const decision=harness('decide','#valj');assert.equal(decision.run('mode'),'decide');decision.submit();assert(decision.nodes.error.hidden);
});

test('numbers and coin remain usable and group validation rejects excessive groups',()=>{
  const h=harness('numbers');h.submit();assert.equal(h.nodes.output.children[0].children.length,1);assert(h.nodes.error.hidden);
  const coin=harness('decide');coin.submit();assert.match(coin.run('lastText'),/^(Krona|Klave)$/);
  const group=harness('groups');group.input('A');group.submit();assert.match(group.nodes.error.textContent,/Antalet grupper/);assert(!group.nodes.error.hidden);
});

test('preparation opens presentation only after a valid draw; editing resets the choice pool',()=>{
  const h=harness();assert(!h.nodes['prepare-view'].hidden);assert(h.nodes['presentation-view'].hidden);
  h.submit();assert(!h.nodes['prepare-view'].hidden);assert(!h.nodes.error.hidden);
  h.input('A\nB\nC');h.submit();assert(h.nodes['prepare-view'].hidden);assert(!h.nodes['presentation-view'].hidden);
  assert.equal(h.nodes['next-draw'].textContent,'Välj nästa');
  h.nodes['edit-draw'].click();assert(!h.nodes['prepare-view'].hidden);assert.equal(h.nodes.entries.value,'A\nB\nC');
  assert.equal(h.run('drawn.size'),0);assert.equal(h.run('resultHistory.length'),0);assert(h.nodes.history.hidden);
  assert.equal(h.nodes.submit.textContent,'Välj slumpmässigt');
  h.submit();assert.equal(h.run('drawn.size'),1);assert.equal(h.run('resultHistory.length'),1);
});

test('next draws the remaining batch and starts a new round only when the pool is exhausted',()=>{
  const h=harness();h.input('A\nB\nC\nD\nE');h.nodes.count.value='3';h.submit();
  const first=h.run('lastText').split('\n');assert.equal(h.nodes['next-draw'].textContent,'Välj sista (2)');
  h.nodes['next-draw'].click();const last=h.run('lastText').split('\n');assert.equal(last.length,2);assert(first.every(n=>!last.includes(n)));
  assert.equal(h.nodes.count.value,'3');assert.equal(h.nodes['next-draw'].textContent,'Börja ny omgång');
  h.nodes['next-draw'].click();assert.equal(h.run('lastText').split('\n').length,3);assert.equal(h.run('drawn.size'),3);
  assert.equal(h.run('resultHistory.length'),3);assert(!h.nodes['history'].hidden);
});

test('presentation repeats groups and lists using the existing input and settings',()=>{
  const h=harness('groups');h.input('A\nB\nC\nD\nE');h.nodes.count.value='2';h.submit();assert.equal(h.nodes['next-draw'].textContent,'Gör om grupperna');
  h.nodes['next-draw'].click();assert.equal(h.nodes.output.children[0].children.length,2);assert.equal(h.nodes.entries.value,'A\nB\nC\nD\nE');
  h.nodes['edit-draw'].click();h.switchTo('list');h.submit();assert.equal(h.nodes['next-draw'].textContent,'Blanda igen');h.nodes['next-draw'].click();
  assert.equal(h.nodes.output.children[0].tag,'ol');assert.equal(h.nodes.output.children[0].children.length,5);
});

test('returning to preparation starts fresh after both partial and exhausted rounds in every mode',()=>{
  for(const mode of ['choose','groups','list']){
    const h=harness(mode);const text='A\nB\nC\nD\nE';h.input(text);h.nodes.count.value='3';h.submit();
    for(const exhaust of [false,true]){
      if(exhaust)h.nodes['next-draw'].click();
      h.nodes['edit-draw'].click();
      assert.equal(h.nodes.entries.value,text);assert.equal(h.nodes.count.value,'3');assert(h.nodes.unique.checked);
      assert.equal(h.run('drawn.size'),0);assert.equal(h.run('resultHistory.length'),0);assert.equal(h.run('lastText'),'');
      assert(h.nodes.copy.disabled);assert(h.nodes.history.hidden);assert(!h.nodes.history.open);
      assert.equal(h.nodes.submit.textContent,{choose:'Välj slumpmässigt',groups:'Skapa grupper',list:'Blanda listan'}[mode]);
      h.submit();assert.equal(h.run('resultHistory.length'),1);assert(h.nodes.history.hidden);assert(h.nodes.error.hidden);
      if(mode==='choose'){assert.equal(h.run('lastText').split('\n').length,3);assert.equal(h.run('drawn.size'),3);}
    }
  }
});

test('Slumpval defaults to coin and switches modes with matching actions and navigation',()=>{
  const h=harness('decide');assert.equal(h.run('decisionMode'),'coin');assert.equal(h.nodes.submit.textContent,'Singla slant');assert(h.nodes['dice-fields'].hidden);assert(h.nodes['dice-count'].disabled);
  h.submit();assert.match(h.run('lastText'),/^(Krona|Klave)$/);assert.equal(h.nodes['next-draw'].textContent,'Singla igen');
  h.nodes['next-draw'].click();assert.equal(h.run('resultHistory.length'),2);
  h.nodes['edit-draw'].click();assert.equal(h.run('resultHistory.length'),0);assert(!h.nodes['prepare-view'].hidden);
  h.decisionButtons[1].click();assert.equal(h.nodes.submit.textContent,'Slumpa ja eller nej');h.submit();assert.match(h.run('lastText'),/^(Ja|Nej)$/);
  h.nodes['edit-draw'].click();h.decisionButtons[2].click();assert.equal(h.window.location.hash,'#tarning');assert(!h.nodes['dice-fields'].hidden);assert(!h.nodes['dice-count'].disabled);
  h.window.location.hash='#slant';h.windowEvents.popstate();assert.equal(h.run('decisionMode'),'coin');assert(h.nodes['dice-count'].disabled);
  assert.equal(harness('decide','#ja-eller-nej').run('decisionMode'),'yes');
});

test('dice results respect the count and die type and include the correct sum and copied text',()=>{
  for(const sides of [4,6,8,10,12,20,100]){
    const h=harness('decide','#tarning');h.nodes['dice-count'].value='12';h.nodes['dice-sides'].value=String(sides);h.submit();
    assert(h.nodes.error.hidden);const dice=h.nodes.output.children[0].children;assert.equal(dice.length,12);
    const values=dice.map(li=>Number(li.children[0].textContent));assert(values.every(n=>Number.isInteger(n)&&n>=1&&n<=sides));
    const sum=values.reduce((a,b)=>a+b,0);assert.equal(h.nodes.status.textContent,'Summa: '+sum);assert(h.run('lastText').includes('Tärning 12: '));assert(h.run('lastText').endsWith('Summa: '+sum));
    assert.equal(h.nodes['next-draw'].textContent,'Kasta igen');h.nodes['next-draw'].click();assert.equal(h.nodes.output.children[0].children.length,12);
    h.nodes['edit-draw'].click();assert.equal(h.nodes['dice-count'].value,'12');assert.equal(h.nodes['dice-sides'].value,String(sides));assert.equal(h.run('resultHistory.length'),0);
  }
});

test('invalid dice settings stay in preparation, and unused dice fields do not affect coin flips',()=>{
  for(const count of ['0','101','1.5','']){const h=harness('decide','#tarning');h.nodes['dice-count'].value=count;h.submit();assert(!h.nodes.error.hidden);assert(!h.nodes['prepare-view'].hidden);assert.equal(h.run('resultHistory.length'),0);}
  const h=harness('decide','#tarning');h.nodes['dice-sides'].value='7';h.submit();assert(!h.nodes.error.hidden);
  h.nodes['dice-count'].value='0';h.decisionButtons[0].click();h.submit();assert(h.nodes.error.hidden);assert.match(h.run('lastText'),/^(Krona|Klave)$/);
});

test('identical results get a fresh counter, announcement and fade; clearing history does not reset numbering',()=>{
  const h=harness('decide','#ja-eller-nej');h.run('randomInt=()=>1');h.submit();
  assert.equal(h.run('lastText'),'Nej');assert.equal(h.nodes['draw-counter'].textContent,'Slumpning 1');assert.equal(h.nodes['draw-announcement'].textContent,'Slumpning 1: Nej');
  h.nodes['next-draw'].click();assert.equal(h.run('lastText'),'Nej');assert.equal(h.nodes['draw-counter'].textContent,'Slumpning 2');assert.equal(h.nodes['draw-announcement'].textContent,'Slumpning 2: Nej');
  assert.equal(h.nodes.output.animations.length,2);assert(h.nodes.output.animations[0].canceled);assert.equal(h.nodes.output.animations[1].options.duration,240);
  h.nodes['clear-history'].click();h.nodes['next-draw'].click();assert.equal(h.nodes['draw-counter'].textContent,'Slumpning 3');
  h.nodes['edit-draw'].click();assert.equal(h.nodes['draw-counter'].textContent,'');assert.equal(h.nodes['draw-announcement'].textContent,'');assert(h.nodes.output.animations[2].canceled);
  h.submit();assert.equal(h.nodes['draw-counter'].textContent,'Slumpning 1');
});

test('reduced motion keeps fresh announcements and numbering without animations',()=>{
  const h=harness('decide','#slant',null,new Map(),false,true);h.run('randomInt=()=>0');h.submit();h.nodes['next-draw'].click();
  assert.equal(h.run('lastText'),'Krona');assert.equal(h.nodes['draw-counter'].textContent,'Slumpning 2');assert.equal(h.nodes['draw-announcement'].textContent,'Slumpning 2: Krona');assert.equal(h.nodes.output.animations.length,0);
});

test('every presentation mode numbers successful draws and resets when returning to preparation',()=>{
  for(const [mode,hash] of [['choose',''],['groups',''],['list',''],['numbers',''],['decide','#slant'],['decide','#ja-eller-nej'],['decide','#tarning']]){
    const h=harness(mode,hash);if(['choose','groups','list'].includes(mode))h.input('A\nB\nC');h.submit();h.nodes['next-draw'].click();
    assert.equal(h.nodes['draw-counter'].textContent,'Slumpning 2');assert(h.nodes['draw-announcement'].textContent.startsWith('Slumpning 2: '));
    h.nodes['edit-draw'].click();h.submit();assert.equal(h.nodes['draw-counter'].textContent,'Slumpning 1');
  }
});

test('numbers share the presentation flow, retain settings, and enforce uniqueness per draw',()=>{
  const h=harness('numbers');assert(!h.nodes['prepare-view'].hidden);assert(h.nodes['presentation-view'].hidden);
  h.nodes.min.value='-2';h.nodes.max.value='2';h.nodes.count.value='5';h.submit();
  const values=h.run('lastText').split('\n').map(Number);assert.equal(new Set(values).size,5);assert.deepEqual(values.sort((a,b)=>a-b),[-2,-1,0,1,2]);
  assert.equal(h.nodes['result-title'].textContent,'Dina nummer');assert.equal(h.nodes['presentation-origin'].textContent,'Från -2 till 2 · 5 nummer');assert.equal(h.nodes['next-draw'].textContent,'Slumpa igen');
  h.nodes['next-draw'].click();assert.equal(h.nodes['draw-counter'].textContent,'Slumpning 2');assert.equal(h.run('lastText').split('\n').length,5);
  h.nodes['edit-draw'].click();assert.equal(h.nodes.min.value,'-2');assert.equal(h.nodes.max.value,'2');assert.equal(h.nodes.count.value,'5');assert.equal(h.run('resultHistory.length'),0);
  h.nodes.count.value='6';h.submit();assert(!h.nodes.error.hidden);assert(!h.nodes['prepare-view'].hidden);
  h.nodes.unique.checked=false;h.nodes.min.value='7';h.nodes.max.value='7';h.nodes.count.value='3';h.submit();assert.equal(h.run('lastText'),'7\n7\n7');assert(h.nodes.error.hidden);
});

test('invalid number ranges remain in preparation and valid identical results get fresh feedback',()=>{
  for(const [min,max] of [['9','2'],['1.5','6'],['-1000000001','1'],['0','1000000001']]){
    const h=harness('numbers');h.nodes.min.value=min;h.nodes.max.value=max;h.submit();assert(!h.nodes.error.hidden);assert(!h.nodes['prepare-view'].hidden);assert.equal(h.run('drawNumber'),0);
  }
  const h=harness('numbers');h.nodes.min.value='42';h.nodes.max.value='42';h.submit();h.nodes['next-draw'].click();
  assert.equal(h.run('lastText'),'42');assert.equal(h.nodes['draw-announcement'].textContent,'Slumpning 2: 42');assert.equal(h.nodes['result-title'].textContent,'Ditt nummer');
});

test('locked dice keep their values while unlocked dice reroll; locking does not count as a draw',()=>{
  const h=harness('decide','#tarning');h.nodes['dice-count'].value='5';h.run('randomInt=()=>0');h.submit();
  const buttons=()=>h.nodes.output.children[0].children.map(li=>li.children[0]);
  buttons()[0].click();buttons()[2].click();assert.equal(h.run('drawNumber'),1);assert.equal(h.run('resultHistory.length'),1);
  assert.equal(buttons()[0]['aria-pressed'],'true');assert.match(buttons()[0]['aria-label'],/Låst/);assert.equal(h.nodes['next-draw'].textContent,'Kasta olåsta');assert(!h.nodes['unlock-dice'].hidden);
  h.run('randomInt=()=>5');h.nodes['next-draw'].click();assert.deepEqual(Array.from(h.run('diceValues')),['1','6','1','6','6']);
  assert.equal(h.nodes.status.textContent,'Summa: 20');assert.equal(h.run('drawNumber'),2);assert.equal(h.run('resultHistory.length'),2);
  assert.equal(buttons()[0].animations.length,0);assert.equal(buttons()[1].animations.length,1);assert(h.run('lastText').endsWith('Summa: 20'));
});

test('all locked dice disable rerolls, and unlocking individually or together leaves history untouched',()=>{
  const h=harness('decide','#tarning');h.nodes['dice-count'].value='2';h.submit();const buttons=h.nodes.output.children[0].children.map(li=>li.children[0]);
  buttons[0].click();buttons[0].click();assert.equal(h.run('lockedDice.size'),0);assert(h.nodes['unlock-dice'].hidden);
  buttons.forEach(button=>button.click());assert(h.nodes['next-draw'].disabled);assert.equal(h.nodes['next-draw'].textContent,'Alla tärningar är låsta');
  h.nodes['next-draw'].click();assert.equal(h.run('drawNumber'),1);assert.equal(h.run('resultHistory.length'),1);
  h.nodes['unlock-dice'].click();assert.equal(h.run('lockedDice.size'),0);assert(!h.nodes['next-draw'].disabled);assert.equal(h.nodes['next-draw'].textContent,'Kasta igen');assert(h.nodes['unlock-dice'].hidden);
  assert.equal(h.run('drawNumber'),1);assert.equal(h.run('resultHistory.length'),1);assert(buttons.every(button=>button['aria-pressed']==='false'));
});

test('returning to preparation clears locks and dice; other modes remain usable',()=>{
  const h=harness('decide','#tarning');h.nodes['dice-count'].value='1';h.nodes['dice-sides'].value='20';h.submit();h.nodes.output.children[0].children[0].children[0].click();
  h.nodes['edit-draw'].click();assert.equal(h.run('lockedDice.size'),0);assert.equal(h.run('diceValues.length'),0);assert.equal(h.nodes['dice-sides'].value,'20');assert(!h.nodes['next-draw'].disabled);
  h.decisionButtons[1].click();h.submit();assert.match(h.run('lastText'),/^(Ja|Nej)$/);assert(h.nodes['dice-hint'].hidden);assert(h.nodes['unlock-dice'].hidden);
});

test('dice locks and rerolls respect reduced motion',()=>{
  const h=harness('decide','#tarning',null,new Map(),false,true);h.nodes['dice-count'].value='3';h.submit();h.nodes.output.children[0].children[0].children[0].click();h.nodes['next-draw'].click();
  assert.equal(h.run('lockedDice.size'),1);assert(h.nodes.output.children[0].children.every(li=>li.children[0].animations.length===0));
});

test('group results open a knockout without changing members and retain winners when returning to groups',()=>{
  const h=harness();
  h.run(fs.readFileSync(path.join(root,'assets/matches-core.js'),'utf8'));
  h.run(fs.readFileSync(path.join(root,'assets/matches.js'),'utf8'));
  h.switchTo('groups');h.input('A\nB\nC\nD\nE');h.nodes.count.value='4';h.submit();
  const groups=h.nodes.output.children[0].children.map(group=>group.children[1].children.map(item=>item.textContent).join(', '));
  const originalOutput=h.nodes.output.children[0];
  assert(!h.nodes['tournament-start'].hidden);assert(!h.nodes['tournament-warning'].hidden);
  h.nodes['tournament-start'].click();assert(h.nodes['presentation-view'].hidden);assert(!h.nodes['match-presentation'].hidden);
  const buttons=h.nodes['match-output'].querySelectorAll('button');
  assert.deepEqual(buttons.map(b=>b.children[0].textContent).sort(),groups.slice().sort());
  buttons[0].click();const winner=h.nodes['match-output'].querySelectorAll('button').find(b=>b['aria-pressed']==='true').textContent;
  h.nodes['match-back'].click();assert(!h.nodes['presentation-view'].hidden);assert.equal(h.nodes.output.children[0],originalOutput);
  h.nodes['tournament-start'].click();assert.equal(h.nodes['match-output'].querySelectorAll('button').find(b=>b['aria-pressed']==='true').textContent,winner);
  h.nodes['match-back'].click();h.nodes['next-draw'].click();h.nodes['tournament-start'].click();
  assert(h.nodes['match-output'].querySelectorAll('button').every(b=>b['aria-pressed']==='false'));
  h.nodes['match-back'].click();h.nodes['edit-draw'].click();assert(h.nodes['tournament-start'].hidden);assert(h.nodes['match-presentation'].hidden);
});
test('knockout entry is limited to 4–32 groups and equal teams need no warning',()=>{
  const h=harness();h.run(fs.readFileSync(path.join(root,'assets/matches-core.js'),'utf8'));h.run(fs.readFileSync(path.join(root,'assets/matches.js'),'utf8'));
  h.input(Array.from({length:33},(_,i)=>String(i)).join('\n'));h.submit();assert(h.nodes['tournament-start'].hidden);
  h.switchTo('groups');h.nodes.count.value='1';h.submit();assert(h.nodes['tournament-start'].hidden);
  h.nodes['edit-draw'].click();h.nodes.count.value='33';h.submit();assert(h.nodes['tournament-start'].hidden);
  h.nodes['edit-draw'].click();h.input('A\nB\nC\nD');h.nodes.count.value='2';h.submit();assert(h.nodes['tournament-start'].hidden);assert(h.nodes['tournament-warning'].hidden);
  h.nodes['tournament-start'].click();assert(h.nodes['match-presentation'].hidden);
  h.nodes['edit-draw'].click();h.nodes.count.value='3';h.submit();assert(h.nodes['tournament-start'].hidden);assert(h.nodes['tournament-warning'].hidden);
  h.nodes['edit-draw'].click();h.nodes.count.value='4';h.submit();assert(!h.nodes['tournament-start'].hidden);assert(h.nodes['tournament-warning'].hidden);h.nodes['tournament-start'].click();assert.equal(h.nodes['match-output'].querySelectorAll('button').length,4);
});

test('group preview updates for names, counts and mode changes without dropping duplicate rows',()=>{
 const h=harness();h.input('A\nB\nC\nD\nE\nF\nG\nH\nI');assert(h.nodes['group-preview'].hidden);
 h.switchTo('groups');h.nodes.count.value='4';h.nodes.count.dispatchEvent({type:'input'});
 assert.equal(h.nodes['group-preview'].textContent,'1 grupp med 3 deltagare och 3 grupper med 2.');assert(!h.nodes['group-preview'].hidden);
 h.nodes.count.value='3';h.nodes.count.dispatchEvent({type:'input'});assert.equal(h.nodes['group-preview'].textContent,'3 grupper med 3 deltagare i varje.');
 h.input('A\nA\nB');h.nodes.count.value='3';h.nodes.count.dispatchEvent({type:'input'});assert.equal(h.nodes['group-preview'].textContent,'3 grupper med 1 deltagare i varje.');
 h.nodes.count.value='4';h.nodes.count.dispatchEvent({type:'input'});assert.equal(h.nodes['group-preview'].textContent,'Lägg till 1 namn för att få 4 grupper.');
 for(const count of ['', '0', '1.5','1001']){h.nodes.count.value=count;h.nodes.count.dispatchEvent({type:'input'});assert(h.nodes['group-preview'].hidden);}
 h.input('');assert(h.nodes['group-preview'].hidden);h.switchTo('list');assert(h.nodes['group-preview'].hidden);
});

test('shuffled order reveals numbered rows in sequence, caps animation duration and respects reduced motion',()=>{
 const h=harness();h.switchTo('list');h.input(Array.from({length:50},(_,i)=>'Namn '+i).join('\n'));h.submit();
 const list=h.nodes.output.children[0], rows=list.children;
 assert.equal(list.tag,'ol');assert.equal(list.role,'list');assert.equal(h.nodes['result-title'].textContent,'Din turordning');assert(h.nodes.status.hidden);
 assert.equal(rows.length,50);assert.equal(rows.filter(row=>row.animations.length).length,20);
 assert.equal(rows[0].animations[0].options.delay,0);assert(rows[1].animations[0].options.delay>0);
 assert(rows[19].animations[0].options.delay+rows[19].animations[0].options.duration<=1000);
 h.nodes['next-draw'].click();assert(rows.slice(0,20).every(row=>row.animations[0].canceled));
 const fresh=h.nodes.output.children[0].children;h.nodes['edit-draw'].click();assert(fresh.slice(0,20).every(row=>row.animations[0].canceled));
 const reduced=harness('choose','',null,new Map(),false,true);reduced.switchTo('list');reduced.input('A\nB\nC');reduced.submit();
 assert(reduced.nodes.output.children[0].children.every(row=>row.animations.length===0));
});

test('maximum group size creates balanced groups within the limit and retains both settings',()=>{
 const h=harness();h.switchTo('groups');h.input(Array.from({length:14},(_,i)=>String(i)).join('\n'));h.nodes.count.value='3';
 h.nodes['group-method'].value='size';h.nodes['group-method'].dispatchEvent({type:'change'});assert.equal(Number(h.nodes.count.value),4);
 h.submit();const groups=h.nodes.output.children[0].children.map(g=>g.children[1].children.length);assert.deepEqual(groups,[4,4,3,3]);
 h.nodes['edit-draw'].click();h.nodes.count.value='5';h.nodes.count.dispatchEvent({type:'input'});h.switchTo('choose');h.switchTo('groups');assert.equal(Number(h.nodes.count.value),5);
 h.nodes['group-method'].value='groups';h.nodes['group-method'].dispatchEvent({type:'change'});assert.equal(Number(h.nodes.count.value),3);
 h.nodes['group-method'].value='size';h.nodes['group-method'].dispatchEvent({type:'change'});assert.equal(Number(h.nodes.count.value),5);
 h.nodes.count.value='100';h.submit();assert.equal(h.nodes.output.children[0].children.length,1);
});
test('group size method survives same-tab navigation without changing saved lists',()=>{
 const draft=new Map(),h=harness('choose','',draft);h.switchTo('groups');h.input('A\nB\nC\nD\nE');h.nodes['group-method'].value='size';h.nodes['group-method'].dispatchEvent({type:'change'});h.nodes.count.value='2';h.nodes.count.dispatchEvent({type:'input'});h.windowEvents.pagehide();
 const restored=harness('choose','',draft);assert.equal(restored.run('groupingMethod'),'size');assert.equal(Number(restored.nodes.count.value),2);assert.equal(restored.nodes['countLabel'].textContent,'Personer per grupp');restored.submit();assert.equal(restored.nodes.output.children[0].children.length,3);
});

test('new sessions default to max four per group and explicit session choices take precedence',()=>{
 const h=harness('groups','',null,new Map(),false,false,null);assert.equal(h.run('groupingMethod'),'size');assert.equal(Number(h.nodes.count.value),4);assert.equal(h.nodes['group-method'].value,'size');
 h.input('A\nB\nC\nD\nE');h.submit();assert.equal(h.nodes.output.children[0].children.length,2);
 const draft=new Map(),saved=harness('choose','',draft);saved.switchTo('groups');saved.nodes.count.value='3';saved.nodes.count.dispatchEvent({type:'input'});saved.windowEvents.pagehide();
 const restored=harness('choose','',draft,new Map(),false,false,null);assert.equal(restored.run('groupingMethod'),'groups');assert.equal(Number(restored.nodes.count.value),3);
});
