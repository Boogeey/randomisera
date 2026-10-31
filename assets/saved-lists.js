(() => {
  'use strict';
  const key='randomisera-saved-lists-v1';
  const $=id=>document.getElementById(id);
  const normalize=name=>name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('sv');
  const inputEntries=()=>$('entries').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const message=text=>{$('saved-list-status').textContent=text;};
  let active=null,saveReturn='open-save';
  function read(){
    const raw=localStorage.getItem(key);if(raw===null)return [];
    const data=JSON.parse(raw);
    if(!data||data.version!==1||!Array.isArray(data.lists)||!data.lists.every(list=>typeof list.name==='string'&&list.name.trim()&&Array.isArray(list.entries)&&list.entries.every(entry=>typeof entry==='string')))throw Error('Invalid saved lists');
    if(new Set(data.lists.map(list=>normalize(list.name))).size!==data.lists.length)throw Error('Duplicate saved lists');
    return data.lists;
  }
  function write(lists){localStorage.setItem(key,JSON.stringify({version:1,lists}));}
  const fail=()=>message('Kunde inte läsa eller spara listorna. Webbläsarens lagring kan vara blockerad, full eller innehålla skadade data. Din inmatning finns kvar.');
  function activeState(){
    $('active-list').hidden=!active;$('open-save').hidden=!!active;
    $('active-list-name').textContent=active?'Hämtad lista: '+active.name:'';
    $('update-list').disabled=!active||same(inputEntries(),active.entries);
    $('open-save').disabled=inputEntries().length===0;
    $('save-as-new').disabled=inputEntries().length===0;
  }
  function panels(which){
    $('list-picker').hidden=which!=='picker';$('list-save').hidden=which!=='save';
    $('open-lists').setAttribute('aria-expanded',String(which==='picker'));
    for(const id of ['open-save','save-as-new'])$(id).setAttribute('aria-expanded',String(which==='save'));
  }
  function refresh(){
    const lists=read();
    if(active&&!lists.some(list=>normalize(list.name)===normalize(active.name)))active=null;
    const items=$('saved-list-items');items.replaceChildren();
    if(!lists.length){const empty=document.createElement('li');empty.textContent='Du har inga sparade listor ännu.';items.append(empty);}
    for(const list of [...lists].sort((a,b)=>a.name.localeCompare(b.name,'sv'))){
      const row=document.createElement('li'),info=document.createElement('div'),name=document.createElement('strong'),count=document.createElement('span'),actions=document.createElement('div');
      info.className='saved-list-info';name.textContent=list.name;count.textContent=list.entries.length+' alternativ';info.append(name,count);actions.className='saved-list-actions';
      for(const [label,action] of [['Använd',()=>load(normalize(list.name))],['Ta bort',()=>remove(normalize(list.name))]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',label+' listan '+list.name);if(label==='Ta bort')button.className='delete-saved-list';button.addEventListener('click',action);actions.append(button)}
      row.append(info,actions);items.append(row);
    }
    activeState();
  }
  function load(id){try{
    const list=read().find(item=>normalize(item.name)===id);if(!list){refresh();return;}
    const text=list.entries.join('\n'),current=$('entries').value;
    if(text.length>$('entries').maxLength){message('Listan är för stor för inmatningsfältet.');return;}
    if(current.trim()&&current!==text&&!window.confirm('Ersätta det som står i inmatningsfältet med listan ”'+list.name+'”?'))return;
    active={name:list.name,entries:[...list.entries]};$('entries').value=text;$('entries').dispatchEvent(new Event('input',{bubbles:true}));panels(null);activeState();message('Listan ”'+list.name+'” är hämtad.');$('entries').focus();
  }catch{fail();}}
  function remove(id){try{
    const lists=read(),list=lists.find(item=>normalize(item.name)===id);if(!list){refresh();return;}
    if(!window.confirm('Ta bort den sparade listan ”'+list.name+'”?'))return;
    write(lists.filter(item=>normalize(item.name)!==id));refresh();$('close-lists').focus();message('Listan ”'+list.name+'” är borttagen. Inmatningen är kvar.');
  }catch{fail();}}
  function openSave(origin){saveReturn=origin;panels('save');$('list-name').value='';message('');$('list-name').focus();}
  function saveNew(){
    const name=$('list-name').value.trim().replace(/\s+/g,' '),entries=inputEntries();
    if(!name||name.length>80){message('Ange ett listnamn med 1–80 tecken.');$('list-name').focus();return;}
    if(!entries.length){message('Skriv minst ett alternativ innan du sparar.');return;}
    try{const lists=read(),index=lists.findIndex(list=>normalize(list.name)===normalize(name));
      if(index!==-1&&!window.confirm('Vill du ersätta listan ”'+lists[index].name+'”?'))return;
      const list={name,entries};if(index===-1)lists.push(list);else lists[index]=list;
      write(lists);active={name,entries:[...entries]};refresh();panels(null);message('Listan ”'+name+'” är sparad.');$('entries').focus();
    }catch{fail();}
  }
  $('open-lists').addEventListener('click',()=>{try{refresh();panels($('list-picker').hidden?'picker':null);message('');if(!$('list-picker').hidden)$('close-lists').focus();}catch{fail();}});
  $('close-lists').addEventListener('click',()=>{panels(null);$('open-lists').focus();});
  $('open-save').addEventListener('click',()=>openSave('open-save'));
  $('save-as-new').addEventListener('click',()=>openSave('save-as-new'));
  $('cancel-save').addEventListener('click',()=>{panels(null);$(saveReturn).focus();});
  $('save-list').addEventListener('click',saveNew);
  $('list-name').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();saveNew();}if(event.key==='Escape'){event.preventDefault();$('cancel-save').click();}});
  $('update-list').addEventListener('click',()=>{if(!active)return;const entries=inputEntries();if(!entries.length){message('En sparad lista måste innehålla minst ett alternativ.');return;}try{
    const lists=read(),index=lists.findIndex(list=>normalize(list.name)===normalize(active.name));
    if(index===-1){refresh();message('Den sparade listan har tagits bort. Välj Spara lista för att spara på nytt.');return;}
    if(!same(lists[index].entries,active.entries)&&!window.confirm('Listan har ändrats på en annan sida. Vill du ersätta den sparade versionen?'))return;
    const name=lists[index].name;lists[index]={name,entries};write(lists);active={name,entries:[...entries]};refresh();message('Ändringarna i ”'+name+'” är sparade.');
  }catch{fail();}});
  $('entries').addEventListener('input',activeState);
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null){try{refresh();}catch{fail();}}});
  try{refresh();}catch{activeState();fail();}
})();
