/*
 * build.js — assemble the single-file app.
 * Merges content/*.json into one CONTENT object, validates it (incl. running the
 * real Excel engine on every exercise), and inlines it into src/app.template.html
 * to produce index.html at the repo root.
 *   node build.js
 */
const fs = require('fs'), path = require('path');
const ROOT = __dirname, CDIR = path.join(ROOT, 'content');
const TOPICS = ['M&A','LBO','DCF','WACC','Valuation','LevFin','Restructuring','VC','ECM','DCM','Accounting','ProjectFinance','Excel','Markets','Fit'];
const KINDS = ['modules','flashcards','qcm','exercises','cases','glossary'];

// ---- 1. merge ----
const merged = {modules:[],flashcards:[],qcm:[],exercises:[],cases:[],glossary:[]};
const ids = new Set(); const warn = [], err = [];
fs.readdirSync(CDIR).filter(f=>f.endsWith('.json')).sort().forEach(f=>{
  let d; try{ d=JSON.parse(fs.readFileSync(path.join(CDIR,f),'utf8')); }catch(e){ err.push(`${f}: JSON invalide — ${e.message}`); return; }
  KINDS.forEach(k=>(d[k]||[]).forEach(it=>{
    if(!it.id){ err.push(`${f}: item ${k} sans id`); return; }
    if(ids.has(it.id)) warn.push(`id dupliqué ${it.id} (${f})`); else ids.add(it.id);
    merged[k].push(it);
  }));
});

// ---- 2. validate content ----
function hasLoc(x){ return x && typeof x==='object' && (typeof x.fr==='string') && (typeof x.en==='string'); }
merged.modules.forEach(m=>{
  if(!TOPICS.includes(m.topic)) warn.push(`module ${m.id}: topic hors enum "${m.topic}"`);
  if(!m.source||!m.source.flag) warn.push(`module ${m.id}: source.flag manquant`);
  if(!m.content||!hasLoc(m.content.contexte)) warn.push(`module ${m.id}: contexte manquant`);
  if(!hasLoc(m.title)) warn.push(`module ${m.id}: title non bilingue`);
});
merged.qcm.forEach(q=>{
  if(!Array.isArray(q.options)||!q.options.some(o=>o.correct)) err.push(`qcm ${q.id}: aucune option correcte`);
  if(!TOPICS.includes(q.topic)) warn.push(`qcm ${q.id}: topic hors enum "${q.topic}"`);
});
merged.flashcards.forEach(c=>{ if(!hasLoc(c.front)||!hasLoc(c.back)) warn.push(`flashcard ${c.id}: front/back non bilingue`); });

// ---- 3. extract the real Excel engine from the template and test every exercise ----
const template = fs.readFileSync(path.join(ROOT,'src','app.template.html'),'utf8');
const xlMatch = template.match(/const XL=\(function\(\)\{[\s\S]*?\}\)\(\)/);
let XL=null;
if(xlMatch){ try{ XL = (0,eval)('('+xlMatch[0].replace(/^const XL=/,'')+')'); }catch(e){ warn.push('extraction moteur XL: '+e.message); } }
if(XL){
  merged.exercises.forEach(e=>{
    if(e.kind && e.kind!=='spreadsheet') return;
    const g=e.grid; if(!g||!g.cells){ warn.push(`exercise ${e.id}: pas de grille`); return; }
    // Build cells using the MODEL formulas (what the learner is meant to type)
    const cells={};
    Object.keys(g.cells).forEach(ref=>{ const c=g.cells[ref];
      if(c.role==='input'||c.role==='link') cells[ref]={value:c.value};
      else if(c.role==='formula') cells[ref]={formula:c.formula};
    });
    const out=XL.evalSheet(cells);
    (e.checks||[]).forEach(ck=>{
      const got=out[ck.cell];
      const ok = typeof got==='number' && Math.abs(got-ck.expected)<=(ck.tolerance||0.01);
      if(!ok) err.push(`exercise ${e.id}: check ${ck.cell} attendu ${ck.expected}, modèle donne ${got}`);
    });
  });
}

// ---- 4. glossary marker coverage (info only) ----
const gloss = new Set();
merged.glossary.forEach(g=>{ [g.term].concat(g.aliases||[]).forEach(k=>{ if(k) gloss.add(String(k).toLowerCase().replace(/\s+/g,' ').replace(/[.,;:]+$/,'').trim()); }); });
const unmatched = new Set(); let markerCount=0;
function scan(o){ if(o==null)return; if(typeof o==='string'){ const m=o.match(/\[\[([^\]]+)\]\]/g)||[]; m.forEach(x=>{ markerCount++; const t=x.slice(2,-2).toLowerCase().replace(/\s+/g,' ').replace(/[.,;:]+$/,'').trim(); if(!gloss.has(t)) unmatched.add(t); }); } else if(typeof o==='object'){ for(const k in o) scan(o[k]); } }
scan(merged);

// ---- 5. write index.html ----
const content = JSON.stringify(merged);
const out = template.replace(/\/\*<<CONTENT>>\*\/[\s\S]*?\/\*<<END>>\*\//, ()=>'/*<<CONTENT>>*/'+content+'/*<<END>>*/');
fs.writeFileSync(path.join(ROOT,'index.html'), out);

// ---- 6. report ----
const counts = KINDS.map(k=>`${k}:${merged[k].length}`).join('  ');
console.log('\n=== BUILD ===');
console.log(counts);
console.log(`index.html: ${(out.length/1024).toFixed(0)} KB`);
console.log(`glossary markers: ${markerCount}, sans correspondance: ${unmatched.size}`);
if(unmatched.size) console.log('  termes [[..]] non glossés (rendus en texte simple):', [...unmatched].slice(0,40).join(', '));
if(warn.length){ console.log(`\n${warn.length} avertissement(s):`); warn.slice(0,40).forEach(w=>console.log('  ⚠ '+w)); }
if(err.length){ console.log(`\n${err.length} ERREUR(S):`); err.forEach(e=>console.log('  ✗ '+e)); }
console.log('\n'+(err.length?'BUILD AVEC ERREURS':'BUILD OK')+'\n');
process.exit(err.length?1:0);
