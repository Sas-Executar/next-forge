const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname,'../public/scroll-task-prototype/index.html'),'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(source);
const settle = source.slice(source.indexOf('function settle()'), source.indexOf('function closeMenu('));
function check({manual=true,enabled=true,mode='tasks',view='scroll',index=0,tops=[-600,0,600],until=0},expectedIndex,expectedDone){
 const done = new Set();const ctx={view,writeRoute(){},index,manualForward:manual,scrollCompletes:enabled,mode,programmaticUntil:until,done,items:()=>[{id:'t1'},{id:'t2'},{id:'t3'}],sc:{querySelectorAll:()=>tops.map(top=>({getBoundingClientRect:()=>({top})})),getBoundingClientRect:()=>({top:0})},ids:it=>[it.id],isDone:it=>done.has(it.id),syncDone(){},say(){},ui(){},Date};
 vm.createContext(ctx);vm.runInContext(settle+';settle()',ctx);assert.equal(ctx.index,expectedIndex);assert.deepEqual([...done],expectedDone);
}
check({view:'list'},0,[]);check({},1,['t1']);check({manual:false},1,[]);check({enabled:false},1,[]);check({mode:'phases'},1,[]);check({mode:'workflows'},1,[]);check({until:Date.now()+10000},1,[]);check({index:1,tops:[0,600,1200]},0,[]);check({tops:[-1200,-600,0]},2,[]);check({tops:[-900,0,350]},1,['t1']);check({tops:[-100,900,1500]},0,[]);
console.log('PASS: syntax and 11 scroll contract cases (manual, disabled, programmatic, aggregate, reverse, skip, variable heights).');
