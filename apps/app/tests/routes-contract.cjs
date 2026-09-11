const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
for(const route of ['/','/tarefas','/foco','/configuracoes','/scroll-task-prototype','/execution-assets/app.mjs','/execution-assets/model.mjs','/execution-assets/styles.css']){
 const rule=config.routes.find(r=>new RegExp('^'+r.src+'$').test(route));assert(rule,route);
 const destination=route.replace(new RegExp('^'+rule.src+'$'),rule.dest);assert(fs.existsSync(path.join(root,destination)),destination);
}
const html=fs.readFileSync(path.join(root,'public/scroll-task-prototype/index.html'),'utf8'),app=fs.readFileSync(path.join(root,'public/scroll-task-prototype/app.mjs'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
for(const match of app.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(match[1]),'Missing DOM ID '+match[1]);
console.log('PASS: 8 route/asset mappings, unique IDs and application DOM references.');
