const titles=['Definir objetivo','Validar entregável','Registrar restrições','Mapear usuários','Listar necessidades','Priorizar problemas','Definir escopo','Quebrar entregáveis','Ordenar dependências','Estimar esforço','Definir responsáveis','Confirmar critérios','Preparar ambiente','Reunir referências','Eliminar bloqueios','Produzir primeira versão','Revisar consistência','Ajustar entrega','Executar teste','Registrar falhas','Corrigir falhas','Preparar apresentação','Solicitar aprovação','Incorporar retorno','Finalizar artefatos','Registrar decisão','Atualizar status','Publicar entrega','Revisar pendências','Encerrar ciclo'];const groups=['Direcionamento do produto','Entendimento do usuário','Planejamento do ciclo','Planejamento operacional','Preparação da execução','Construção da entrega','Validação interna','Aprovação','Fechamento','Encerramento'];const phase=i=>i<6?'Descoberta':i<12?'Planejamento':i<21?'Execução e validação':'Entrega',workflow=i=>i<12?'Estratégia':i<21?'Produção':'Entrega';const base=titles.map((title,i)=>({id:'t'+(i+1),title,task:groups[Math.floor(i/3)],phase:phase(i),workflow:workflow(i),context:`Execute “${title}” dentro de ${groups[Math.floor(i/3)]}. Mantenha somente o contexto necessário para concluir esta unidade.`}));
export {base};
export const STORE = 'executar-scroll-v7';
export const levels = {tasks:'Tarefas',actions:'Ações',phases:'Fases',workflows:'Workflows'};
export function units(mode='tasks') {
  if (mode==='tasks'||mode==='actions') return base;
  const key=mode==='phases'?'phase':'workflow', groups=new Map();
  for(const task of base){
    if(!groups.has(task[key])) groups.set(task[key],{id:key+task[key],title:task[key],context:`Execute as tarefas de ${task[key]}.`,members:[]});
    groups.get(task[key]).members.push(task.id);
  }
  return [...groups.values()];
}
export const ids = unit => unit.members || [unit.id];
export const completed = (state,unit) => ids(unit).every(id=>state.done.includes(id));
export function hydrate(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  const mode=Object.hasOwn(levels,raw.mode)?raw.mode:'tasks';
  const duration=[10,900,1800,2700].includes(+raw.duration)?+raw.duration:1800;
  return {mode,index:Math.max(0,Math.min(Number.isInteger(raw.index)?raw.index:0,units(mode).length-1)),
    view:raw.view==='scroll'?'scroll':'list',done:[...new Set(Array.isArray(raw.done)?raw.done.filter(id=>base.some(t=>t.id===id)):[])],
    notes:raw.notes&&typeof raw.notes==='object'?Object.fromEntries(Object.entries(raw.notes).filter(([k,v])=>typeof v==='string')):{},
    duration,remaining:Number.isFinite(raw.remaining)?Math.max(0,raw.remaining):duration,auto:!!raw.auto,
    scrollCompletes:raw.scrollCompletes!==false,showDetails:raw.showDetails!==false,hideDone:!!raw.hideDone,
    theme:['light','dark'].includes(raw.theme)?raw.theme:'system'};
}
export function setDone(state,unit,value) {
  const result=new Set(state.done);ids(unit).forEach(id=>value?result.add(id):result.delete(id));
  return {...state,done:[...result]};
}
export function changeLevel(state,mode) {
  if(!Object.hasOwn(levels,mode))return state;
  const anchor=ids(units(state.mode)[state.index])[0];
  return {...state,mode,index:Math.max(0,units(mode).findIndex(it=>ids(it).includes(anchor)))};
}
export function scrollMayComplete(state,{from,to,manual=false,programmatic=false}) {
  return state.view==='scroll'&&state.scrollCompletes&&['tasks','actions'].includes(state.mode)&&manual&&!programmatic&&to===from+1&&to<units(state.mode).length;
}
export function routeURL(state,page) {
  const params=new URLSearchParams({nivel:state.mode,unidade:units(state.mode)[state.index].id});
  return (page==='settings'?'/configuracoes':state.view==='scroll'?'/foco':'/tarefas')+'?'+params;
}
export function readRoute(url,state) {
  const old=new URLSearchParams(url.hash.slice(1)),params=url.searchParams;
  const mode=params.get('nivel')||old.get('mode');
  let next=mode&&Object.hasOwn(levels,mode)?changeLevel(state,mode):{...state};
  if(url.pathname==='/foco')next.view='scroll';
  else if(url.pathname==='/tarefas')next.view='list';
  else if(['scroll','list'].includes(old.get('view')))next.view=old.get('view');
  const selected=params.get('unidade')||old.get('unit');
  if(selected){const i=units(next.mode).findIndex(it=>it.id===selected);next.index=i<0?0:i;}
  return {state:next,page:url.pathname==='/configuracoes'?'settings':'execution'};
}
