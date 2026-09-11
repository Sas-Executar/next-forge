import {base,STORE,levels,units,ids,completed,hydrate,setDone,changeLevel,scrollMayComplete,routeURL,readRoute} from './model.mjs';
const $=id=>document.getElementById(id);
const icons={menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',up:'<path d="m6 14 6-6 6 6"/>',down:'<path d="m6 10 6 6 6-6"/>',list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',focus:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><circle cx="12" cy="12" r="3"/>',settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',project:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16"/>',note:'<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.list}</svg>`;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
let raw;try{raw=JSON.parse(localStorage.getItem(STORE)||'{}')}catch{}
let state=hydrate(raw),page='execution',running=false,lastTick=0,manual=false,programmaticUntil=0,touchY=null,settleTimer,toastTimer;
const collapsed=new Set(),sc=$('scroller');
({state,page}=readRoute(new URL(location.href),state));
function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{}}
function current(){return units(state.mode)[state.index]}
function hierarchy(unit){return unit.members?levels[state.mode]:`${unit.workflow} · ${unit.phase} · ${unit.task}`}
function announce(text){$('status').textContent=text}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2200);announce(text)}
function writeRoute(push=true){const next=routeURL(state,page);if(location.pathname+location.search+location.hash!==next)history[push?'pushState':'replaceState'](null,'',next)}
function navMarkup(){
  const link=(label,route,mode,svg)=>{const next=mode?changeLevel(state,mode):state;const view=route==='focus'?'scroll':'list';const target=route==='settings'?'settings':'execution';const href=routeURL({...next,view:target==='settings'?state.view:view},target);const active=route==='settings'?page==='settings':page==='execution'&&state.view===view&&(route==='focus'||state.mode===mode);return `<a href="${esc(href)}" data-route="${route}" ${mode?`data-mode="${mode}"`:''} ${active?'aria-current="page"':''}>${icon(svg)}<span>${label}</span></a>`};
  return `<nav class="navLinks" aria-label="Aplicativo">${link('Tarefas','list','tasks','list')}${link('Foco','focus',null,'focus')}${link('Configurações','settings',null,'settings')}</nav><p class="navLabel">LANÇAMENTO DO MVP</p><nav class="navLinks" aria-label="Níveis do projeto">${link('Workflows','list','workflows','project')}${link('Fases','list','phases','project')}${link('Ações','list','actions','list')}</nav>`;
}
function listMarkup(){
  const groups=new Map();units(state.mode).forEach((unit,i)=>{if(state.hideDone&&completed(state,unit))return;const group=unit.phase||levels[state.mode];if(!groups.has(group))groups.set(group,[]);groups.get(group).push({unit,i})});
  if(!groups.size)return '<p class="empty">Todas as unidades estão concluídas. Desative “Ocultar concluídas” no menu para revê-las.</p>';
  return [...groups].map(([group,rows])=>`<details class="taskGroup" data-group="${esc(group)}" ${collapsed.has(group)?'':'open'}><summary>${esc(group)}<span class="groupCount">${rows.length}</span></summary><ul class="taskList">${rows.map(({unit,i})=>{const done=completed(state,unit);return `<li class="taskRow ${done?'isDone':''}" data-i="${i}"><label class="checkTarget"><input type="checkbox" data-check="${i}" ${done?'checked':''} aria-label="Concluir ${esc(unit.title)}"></label><button class="rowTitle" data-detail="${i}"><span class="taskName">${esc(unit.title)}</span>${state.showDetails?`<small>${esc(unit.task||`${ids(unit).length} tarefas`)}${done?' · Concluída':''}</small>`:''}</button><button class="iconButton rowDetail" data-detail="${i}" aria-label="Detalhes de ${esc(unit.title)}">${icon('note')}</button></li>`}).join('')}</ul></details>`).join('');
}
function focusMarkup(){return units(state.mode).map((unit,i)=>`<section class="focusSlide ${completed(state,unit)?'isDone':''}" data-i="${i}" aria-label="${esc(unit.title)}"><div class="focusContent"><p class="focusPosition"><strong>${String(i+1).padStart(2,'0')} / ${units(state.mode).length}</strong><span>${completed(state,unit)?'Concluída':levels[state.mode]}</span></p><h2 class="focusTitle">${esc(unit.title)}</h2><p class="focusPending">${completed(state,unit)?'✓ Concluído':base.length-state.done.length+' pendentes'}</p><p class="focusMeta">${esc(hierarchy(unit))}</p><button class="quietButton contextButton" data-detail="${i}">${icon('note')}Contexto e notas</button></div></section>`).join('')}
function render({keepScroll=false}={}){
  manual=false;programmaticUntil=Date.now()+700;const top=sc.scrollTop;
  document.documentElement.dataset.theme=state.theme;
  document.querySelectorAll('[data-navigation]').forEach(el=>el.innerHTML=navMarkup());
  const settings=page==='settings',focus=!settings&&state.view==='scroll';
  $('pageTitle').textContent=settings?'Configurações':focus?'Foco':levels[state.mode];
  document.title=`EXECUTAR · ${$('pageTitle').textContent}`;
  $('pageSummary').textContent=settings?'Preferências de execução':`${base.length-state.done.length} pendentes · ${state.done.length} concluídas`;
  $('sidebarProgress').textContent=`${state.done.length} de ${base.length} concluídas`;
  $('viewToggle').hidden=settings;$('viewToggle').textContent=focus?'Lista':'Foco';$('viewToggle').setAttribute('aria-label',focus?'Mudar para lista':'Mudar para foco');
  $('more').hidden=settings;$('focusTools').hidden=!focus;$('focusFooter').hidden=!focus;$('settings').hidden=!settings;sc.hidden=settings;
  if(!settings){sc.className=`scroller ${focus?'focusView':'listView'}`;sc.setAttribute('aria-label',levels[state.mode]);sc.innerHTML=focus?focusMarkup():listMarkup();sc.querySelectorAll('[data-group]').forEach(el=>el.addEventListener('toggle',()=>el.open?collapsed.delete(el.dataset.group):collapsed.add(el.dataset.group)));requestAnimationFrame(()=>{if(keepScroll)sc.scrollTop=top;else if(focus)scrollToCurrent(false);else sc.scrollTop=0})}
  $('theme').value=state.theme;$('preferredView').value=state.view;$('duration').value=String(state.duration);
  for(const [id,key] of [['showDetails','showDetails'],['hideDone','hideDone'],['settingDetails','showDetails'],['settingHide','hideDone'],['settingAuto','auto'],['completeOnScroll','scrollCompletes']])$(id).checked=state[key];
  $('showDetails').disabled=focus;$('hideDone').disabled=focus;
  updateControls();save();
}
function updateControls(){const done=completed(state,current());$('completeCurrent').textContent=done?'Reabrir':state.mode==='tasks'?'Concluir tarefa':state.mode==='actions'?'Concluir ação':'Concluir unidade';$('completeTask').textContent=done?'Reabrir':'Concluir';$('previousUnit').disabled=state.index===0;$('nextUnit').disabled=state.index===units(state.mode).length-1;$('autoToggle').setAttribute('aria-pressed',String(state.auto));const seconds=Math.max(0,Math.ceil(state.remaining));$('timerToggle').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('timerToggle').setAttribute('aria-label',`${running?'Pausar':'Iniciar'} timer`);$('timerToggle').setAttribute('aria-pressed',String(running))}
function closeOptions(){ $('viewOptions').hidden=true;$('more').setAttribute('aria-expanded','false') }
function navigate(route,mode){if(route!=='focus')running=false;closeOptions();if($('navigationDialog').open)$('navigationDialog').close();if(mode)state=changeLevel(state,mode);page=route==='settings'?'settings':'execution';if(route==='list')state.view='list';if(route==='focus')state.view='scroll';writeRoute();render();$('content').focus();announce($('pageTitle').textContent)}
function scrollToCurrent(smooth=true){const node=sc.querySelector(`[data-i="${state.index}"]`);if(node?.closest('details'))node.closest('details').open=true;node?.scrollIntoView({block:state.view==='scroll'?'start':'nearest',behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'})}
function go(index,{record=true}={}){manual=false;programmaticUntil=Date.now()+1000;state.index=Math.max(0,Math.min(index,units(state.mode).length-1));if(record)writeRoute();updateControls();save();if(page==='execution')scrollToCurrent();announce(`${state.index+1} de ${units(state.mode).length}: ${current().title}`)}
function complete(index,value){state.index=index;const unit=current();state=setDone(state,unit,value);writeRoute(false);render({keepScroll:true});toast(value?'Unidade concluída':'Unidade reaberta')}
function openTask(index){running=false;state.index=index;writeRoute(false);save();const unit=current();$('taskTitle').textContent=unit.title;$('taskHierarchy').textContent=hierarchy(unit);$('taskContext').textContent=unit.context;$('taskNote').value=state.notes[unit.id]||'';updateControls();$('taskDialog').showModal()}
function settle(){if(page!=='execution'||state.view!=='scroll'){manual=false;return}const top=sc.getBoundingClientRect().top;let next=state.index,best=Infinity;sc.querySelectorAll('.focusSlide').forEach(el=>{const distance=Math.abs(el.getBoundingClientRect().top-top);if(distance<best){best=distance;next=+el.dataset.i}});if(next===state.index){manual=false;return}const eligible=scrollMayComplete(state,{from:state.index,to:next,manual,programmatic:Date.now()<programmaticUntil});manual=false;if(eligible){state=setDone(state,current(),true);state.index=next;render({keepScroll:true});toast('Concluído pelo scroll')}else state.index=next;writeRoute(false);updateControls();save()}
// Native controls own Enter/Space. Global shortcuts apply only to the execution surface.
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'){closeOptions();$('more').focus();return}if(page!=='execution'||e.target.closest('button,a,input,select,textarea,summary,[contenteditable]'))return;if(state.view==='scroll'&&['ArrowDown','PageDown','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();go(state.index+(['ArrowDown','PageDown'].includes(e.key)?1:-1))}else if(state.view==='scroll'&&e.key==='Enter'){e.preventDefault();$('completeCurrent').click()}else if(state.view==='scroll'&&e.key===' '){e.preventDefault();toggleTimer()}});
document.addEventListener('click',e=>{const link=e.target.closest('a[data-route]');if(link&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&e.button===0){e.preventDefault();navigate(link.dataset.route,link.dataset.mode);return}if(!e.target.closest('#viewOptions,#more'))closeOptions()});
$('openNavigation').onclick=()=>$('navigationDialog').showModal();$('closeNavigation').onclick=()=>$('navigationDialog').close();
$('viewToggle').onclick=()=>navigate(state.view==='list'?'focus':'list');
$('more').onclick=()=>{const open=$('viewOptions').hidden;$('viewOptions').hidden=!open;$('more').setAttribute('aria-expanded',String(open));if(open)$('viewOptions').querySelector('input:not(:disabled),a')?.focus()};
sc.addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(b)openTask(+b.dataset.detail)});
sc.addEventListener('change',e=>{if(!e.target.matches('[data-check]'))return;const i=+e.target.dataset.check;complete(i,e.target.checked);requestAnimationFrame(()=>{const next=sc.querySelector(`[data-check="${i}"]`)||sc.querySelector('[data-check]');(next||$('more')).focus()})});
$('closeTask').onclick=()=>$('taskDialog').close();$('taskDialog').addEventListener('close',()=>{const trigger=sc.querySelector(`[data-detail="${state.index}"]`);(trigger||$('viewToggle')).focus()});
$('taskNote').oninput=e=>{state.notes[current().id]=e.target.value;save()};
$('completeTask').onclick=()=>complete(state.index,!completed(state,current()));
$('focusTask').onclick=()=>{$('taskDialog').close();navigate('focus')};
$('completeCurrent').onclick=()=>{const i=state.index,value=!completed(state,current());complete(i,value);if(value&&i<units(state.mode).length-1)requestAnimationFrame(()=>go(i+1))};
$('previousUnit').onclick=()=>go(state.index-1);$('nextUnit').onclick=()=>go(state.index+1);
function toggleTimer(){if(!running&&state.remaining<=0)state.remaining=state.duration;running=!running;lastTick=Date.now();updateControls()}
$('timerToggle').onclick=toggleTimer;$('autoToggle').onclick=()=>{state.auto=!state.auto;save();updateControls()};
setInterval(()=>{if(!running)return;const now=Date.now();state.remaining=Math.max(0,state.remaining-(now-lastTick)/1000);lastTick=now;if(state.remaining===0){if(state.auto&&state.index<units(state.mode).length-1){go(state.index+1);state.remaining=state.duration;toast('Auto Mode · próxima unidade')}else{running=false;toast('Tempo concluído')}}save();updateControls()},250);
for(const [id,key] of [['showDetails','showDetails'],['hideDone','hideDone'],['settingDetails','showDetails'],['settingHide','hideDone'],['settingAuto','auto'],['completeOnScroll','scrollCompletes']])$(id).onchange=e=>{state[key]=e.target.checked;render({keepScroll:true})};
$('theme').onchange=e=>{state.theme=e.target.value;render({keepScroll:true})};$('preferredView').onchange=e=>{state.view=e.target.value;render()};
$('duration').onchange=e=>{state.duration=+e.target.value;state.remaining=state.duration;running=false;save();updateControls()};$('resetTimer').onclick=()=>{state.remaining=state.duration;running=false;save();updateControls();toast('Timer reiniciado')};
$('resetProgress').onclick=()=>$('resetDialog').showModal();$('cancelReset').onclick=()=>$('resetDialog').close();$('confirmReset').onclick=()=>{state.done=[];$('resetDialog').close();render();toast('Conclusões limpas')};
sc.addEventListener('wheel',e=>{if(e.isTrusted&&!e.ctrlKey){manual=e.deltaY>0;programmaticUntil=0}},{passive:true});
sc.addEventListener('touchstart',e=>{touchY=e.touches[0]?.clientY;manual=false},{passive:true});sc.addEventListener('touchmove',e=>{const y=e.touches[0]?.clientY;if(e.isTrusted&&touchY!==null&&Math.abs(y-touchY)>8){manual=y<touchY;programmaticUntil=0;touchY=y}},{passive:true});
sc.addEventListener('scroll',()=>{clearTimeout(settleTimer);settleTimer=setTimeout(settle,150)},{passive:true});sc.addEventListener('scrollend',settle);
new ResizeObserver(()=>{manual=false;programmaticUntil=Date.now()+700}).observe(sc);
window.addEventListener('popstate',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());({state,page}=readRoute(new URL(location.href),state));if(page!=='execution'||state.view!=='scroll')running=false;closeOptions();render()});
render();writeRoute(false);
