/* content-check.js — deep integrity QA on the merged CONTENT inside index.html. */
const fs=require('fs');
const h=fs.readFileSync(__dirname+'/index.html','utf8');
const m=h.match(/\/\*<<CONTENT>>\*\/([\s\S]*?)\/\*<<END>>\*\//);
const C=JSON.parse(m[1]);
let errs=[],warns=[],checked=0;
const isLoc=x=>x&&typeof x==='object'&&typeof x.fr==='string'&&x.fr.trim()&&typeof x.en==='string'&&x.en.trim();
function loc(it,path,val){checked++;if(!isLoc(val))errs.push(`${it}: ${path} non bilingue/vide`);}
const modIds=new Set(C.modules.map(x=>x.id));

C.modules.forEach(m=>{
  loc(m.id,'title',m.title); loc(m.id,'objective',m.objective);
  if(!m.content){errs.push(`${m.id}: pas de content`);return;}
  loc(m.id,'contexte',m.content.contexte);
  (m.content.concepts||[]).forEach((c,i)=>{loc(m.id,`concept[${i}].heading`,c.heading);loc(m.id,`concept[${i}].body`,c.body);});
  if(m.content.exempleChiffre)loc(m.id,'exempleChiffre.body',m.content.exempleChiffre.body);
  (m.content.piegesEntretien||[]).forEach((p,i)=>loc(m.id,`piege[${i}]`,p));
  if((m.content.concepts||[]).length<2)warns.push(`${m.id}: <2 concepts`);
});
C.flashcards.forEach(c=>{loc(c.id,'front',c.front);loc(c.id,'back',c.back);if(c.moduleId&&!modIds.has(c.moduleId))warns.push(`flashcard ${c.id}: moduleId inconnu ${c.moduleId}`);});
C.qcm.forEach(q=>{loc(q.id,'stem',q.stem);loc(q.id,'explanation',q.explanation);
  if(!Array.isArray(q.options)||q.options.length<2)errs.push(`qcm ${q.id}: <2 options`);
  else{const nc=q.options.filter(o=>o.correct).length;if(nc<1)errs.push(`qcm ${q.id}: 0 correcte`);if(!q.multi&&nc>1)errs.push(`qcm ${q.id}: single mais ${nc} correctes`);q.options.forEach((o,i)=>loc(q.id,`opt[${i}]`,o.text));}
  if(q.moduleId&&!modIds.has(q.moduleId))warns.push(`qcm ${q.id}: moduleId inconnu ${q.moduleId}`);
});
C.cases.forEach(c=>{loc(c.id,'title',c.title);loc(c.id,'scenario',c.scenario);
  if(!Array.isArray(c.stages)||!c.stages.length)errs.push(`case ${c.id}: 0 stage`);
  else c.stages.forEach((s,i)=>{loc(c.id,`stage[${i}].prompt`,s.prompt);loc(c.id,`stage[${i}].reveal`,s.reveal);});
});
C.glossary.forEach(g=>{checked++;if(!g.term)errs.push(`gloss ${g.id}: pas de term`);loc(g.id,'definition',g.definition);});
C.exercises.forEach(e=>{loc(e.id,'prompt',e.prompt);loc(e.id,'solution',e.solution);
  if(e.grid){const ff=Object.keys(e.grid.cells).filter(k=>e.grid.cells[k].role==='formula');if(!ff.length)warns.push(`exercise ${e.id}: aucune cellule formule`);
    (e.checks||[]).forEach(ck=>{if(!e.grid.cells[ck.cell])warns.push(`exercise ${e.id}: check ${ck.cell} sans cellule`);});}
});

// topic distribution
const dist={};C.modules.forEach(m=>dist[m.topic]=(dist[m.topic]||0)+1);
console.log('\n=== CONTENT INTEGRITY ===');
console.log(`${checked} champs Loc vérifiés`);
console.log('modules/topic:',JSON.stringify(dist));
console.log(`flashcards ${C.flashcards.length} · qcm ${C.qcm.length} (multi: ${C.qcm.filter(q=>q.multi).length}) · exercises ${C.exercises.length} · cases ${C.cases.length} · glossary ${C.glossary.length}`);
if(warns.length){console.log(`\n${warns.length} avertissement(s):`);warns.slice(0,30).forEach(w=>console.log('  ⚠ '+w));}
if(errs.length){console.log(`\n${errs.length} ERREUR(S):`);errs.slice(0,40).forEach(e=>console.log('  ✗ '+e));}
console.log('\n'+(errs.length?'ÉCHEC':'INTÉGRITÉ OK')+'\n');
process.exit(errs.length?1:0);
