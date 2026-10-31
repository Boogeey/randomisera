
'use strict';
const $=id=>document.getElementById(id);
const modes={choose:['Välj','Låt slumpen avgöra','Skriv ett alternativ per rad. Till exempel namn, filmer eller restauranger.'],numbers:['Nummer','Slumpa nummer','Välj ett intervall. Både det lägsta och högsta talet kan dras.'],groups:['Grupper','Dela in i grupper','Skriv ett namn per rad och välj antal grupper. Storleken blir så jämn som möjligt.'],list:['Lista','Blanda en lista','Skriv ett alternativ per rad och få en slumpad ordning.'],decide:['Beslut','Låt slumpen avgöra','Singla slant, få ett ja eller nej eller kasta en tärning.']};
let mode='choose',drawn=new Set(),lastText='';
const resultHistory=[];
let currentDrawVisible=false;

function randomInt(n){if(!Number.isSafeInteger(n)||n<1||n>4294967296)throw Error('Intervallet är för stort.');const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%n}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function entries(){let a=$('entries').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);return $('dedupe').checked?[...new Set(a)]:a}
function clearResult(){currentDrawVisible=false;renderHistory();lastText='';$('output').replaceChildren();const p=document.createElement('p');p.className='empty';p.textContent='Här dyker resultatet upp.';$('output').append(p);$('copy').disabled=true;$('status').textContent='Redo när du är.';$('error').hidden=true;}
function selectMode(next){mode=next;drawn.clear();$('title').textContent=modes[mode][1];$('help').textContent=modes[mode][2];$('submit').textContent=mode==='decide'||mode==='choose'?'Slumpa':modes[mode][1];$('listFields').hidden=!['choose','groups','list'].includes(mode);$('removeDuplicatesLabel').hidden=!['choose','groups','list'].includes(mode);$('numberFields').hidden=mode!=='numbers';$('decisionFields').hidden=mode!=='decide';$('countFields').hidden=!['choose','numbers','groups'].includes(mode);$('uniqueLabel').hidden=!['choose','numbers'].includes(mode);$('reset').hidden=mode!=='choose';$('countLabel').textContent=mode==='groups'?'Antal grupper':mode==='numbers'?'Antal nummer':'Antal att välja';$('listLabel').textContent=mode==='list'||mode==='choose'?'Alternativ, ett per rad':'Namn, ett per rad';$('count').value=mode==='groups'?2:1;for(const id of ['min','max'])$(id).disabled=mode!=='numbers';$('count').disabled=$('countFields').hidden;clearResult();}

function scrollToResult(){
  requestAnimationFrame(()=>{
    const scrollTarget=$(mode==='decide'?'decisionFields':(mode==='groups'||mode==='choose')?'countFields':mode==='numbers'?'numberFields':'submit');
    const offset=(window.visualViewport?.offsetTop || 0)+16;
    const oldSpace=parseFloat(document.body.style.getPropertyValue('--result-scroll-space')) || 0;
    const target=Math.max(0,window.scrollY+scrollTarget.getBoundingClientRect().top-offset);
    const contentBottom=window.scrollY+document.body.getBoundingClientRect().bottom-oldSpace;
    // A short page cannot align the target without room below it. Recalculate
    // the missing space so growing history does not move the target each draw.
    const space=Math.max(0,Math.ceil(target+window.innerHeight-contentBottom));
    document.body.style.setProperty('--result-scroll-space',space+'px');
    document.body.style.setProperty('--result-scroll-offset',offset+'px');
    scrollTarget.scrollIntoView({block:'start',inline:'nearest'});
  });
}

function show(lines,status){
  const result=document.createElement(mode==='list'?'ol':mode==='groups'?'div':'ul');
  result.className='results'+(lines.length===1&&!['groups','list'].includes(mode)?' single':'');
  for(const [index,line] of lines.entries()){
    if(mode==='groups'){
      const group=document.createElement('section');
      group.className='group-result';
      const heading=document.createElement('h3');
      heading.textContent='Grupp '+(index+1);
      const members=document.createElement('ul');
      for(const name of line){const li=document.createElement('li');li.textContent=name;members.append(li)}
      group.append(heading,members);result.append(group);
    }else{
      const li=document.createElement('li');li.textContent=line;result.append(li);
    }
  }
  $('output').replaceChildren(result);
  lastText=mode==='groups'?lines.map((group,i)=>'Grupp '+(i+1)+'\n'+group.join('\n')).join('\n\n'):mode==='list'?lines.map((line,i)=>(i+1)+'. '+line).join('\n'):lines.join('\n');
  const label=mode==='decide'?{coin:'Slant',yes:'Ja eller nej',dice:'Tärning'}[$('decision').value]:'Dragning';
  resultHistory.push({text:lastText,label});currentDrawVisible=true;renderHistory();
  $('copy').disabled=false;$('copy').textContent='Kopiera';$('status').textContent=status;
  scrollToResult();
}
$('form').addEventListener('submit',e=>{e.preventDefault();$('error').hidden=true;try{let lines=[],status='Slumpat och klart.';const count=Number($('count').value);if(['choose','numbers','groups'].includes(mode)&&(!Number.isInteger(count)||count<1||count>1000))throw Error('Välj ett heltal mellan 1 och 1 000.');if(mode==='numbers'){const min=Number($('min').value),max=Number($('max').value);if(!Number.isInteger(min)||!Number.isInteger(max)||min>max||min< -1e9||max>1e9)throw Error('Ange heltal mellan −1 miljard och 1 miljard. Från får inte vara större än till.');const range=max-min+1;if($('unique').checked&&count>range)throw Error('Det finns för få olika nummer. Minska antalet eller tillåt upprepningar.');if($('unique').checked){const selected=new Set();for(let j=range-count;j<range;j++){const t=randomInt(j+1);selected.add(selected.has(t)?j:t)}lines=shuffle([...selected]).map(n=>String(n+min))}else lines=Array.from({length:count},()=>String(min+randomInt(range)));}else if(mode==='decide'){const type=$('decision').value;lines=[type==='dice'?String(1+randomInt(6)):type==='yes'?['Ja','Nej'][randomInt(2)]:['Krona','Klave'][randomInt(2)]];}else{const list=entries();if(!list.length)throw Error('Skriv minst ett alternativ, ett per rad.');if(list.length>10000)throw Error('Använd högst 10 000 rader åt gången.');if(mode==='list')lines=shuffle(list);if(mode==='groups'){if(count>list.length)throw Error('Antalet grupper får inte vara större än antalet personer.');const groups=Array.from({length:count},()=>[]);shuffle(list).forEach((x,i)=>groups[i%count].push(x));lines=groups;status=`${list.length} personer i ${count} grupper.`;}if(mode==='choose'){const pool=list.map((value,index)=>({value,index})).filter(x=>!$('unique').checked||!drawn.has(x.index));if($('unique').checked){if(count>pool.length)throw Error(`Det finns ${pool.length} alternativ kvar. Minska antalet eller återställ urvalet.`);const picks=shuffle(pool).slice(0,count);picks.forEach(x=>drawn.add(x.index));lines=picks.map(x=>x.value);status=`${pool.length-count} av ${list.length} alternativ kvar.`;}else lines=Array.from({length:count},()=>list[randomInt(list.length)]);}}show(lines,status);}catch(err){$('error').textContent=err.message;$('error').hidden=false;}});
for(const id of ['entries','dedupe','unique'])$(id).addEventListener('input',()=>{drawn.clear();clearResult()});
$('reset').addEventListener('click',()=>{drawn.clear();clearResult();$('status').textContent='Alla alternativ är med i urvalet igen.';});
function historyText(){return resultHistory.map((entry,i)=>entry.label+' '+(i+1)+':\n'+entry.text).join('\n\n');}
function renderHistory(){
  const section=$('history');if(!section)return;
  const previous=currentDrawVisible?resultHistory.slice(0,-1):resultHistory;
  section.hidden=previous.length===0;
  const list=$('history-list');list.replaceChildren();
  list.start=previous.length;
  for(let i=previous.length-1;i>=0;i--){const item=document.createElement('li');item.textContent=(mode==='decide'?previous[i].label+': ':'')+previous[i].text;list.append(item)}
  $('copy-history').textContent='Kopiera alla';
}
async function copyText(text,button){
  try{await navigator.clipboard.writeText(text);button.textContent='Kopierat!'}
  catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();button.textContent=ok?'Kopierat!':'Kunde inte kopiera';}
}
$('copy').addEventListener('click',()=>copyText(lastText,$('copy')));
if($('history')){
  $('copy-history').addEventListener('click',()=>copyText(historyText(),$('copy-history')));
  $('clear-history').addEventListener('click',()=>{resultHistory.length=0;currentDrawVisible=false;renderHistory()});
}
selectMode(document.body.dataset.mode || 'choose');

// Keep the undo snapshot in memory only; saved lists and history are independent.
if($('clear-entries')){
  const field=$('entries'),button=$('clear-entries');
  let clearedText=null,changing=false;
  function updateClearButton(){
    button.hidden=field.value.length===0&&clearedText===null;
    button.textContent=clearedText!==null?'Ångra rensning':'Rensa';
  }
  field.addEventListener('input',()=>{if(!changing)clearedText=null;updateClearButton();});
  button.addEventListener('click',()=>{
    if(clearedText!==null){field.value=clearedText;clearedText=null;}
    else{clearedText=field.value;field.value='';}
    changing=true;
    try{field.dispatchEvent(new Event('input',{bubbles:true}));}finally{changing=false;}
    updateClearButton();field.focus();
  });
  window.addEventListener('pageshow',updateClearButton);
  updateClearButton();
}
