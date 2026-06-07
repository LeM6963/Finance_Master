/*
 * xl.test.js — unit tests for the Excel formula engine actually shipped in
 * app.template.html (extracted by regex, so the test == the shipped code).
 *   node src/xl.test.js
 */
const fs=require('fs'),path=require('path');
const tpl=fs.readFileSync(path.join(__dirname,'app.template.html'),'utf8');
const m=tpl.match(/const XL=\(function\(\)\{[\s\S]*?\}\)\(\)/);
if(!m){console.error('XL engine not found');process.exit(1);}
const XL=(0,eval)('('+m[0].replace(/^const XL=/,'')+')');

let pass=0,fail=0;
function near(a,b,t){return typeof a==='number'&&Math.abs(a-b)<=(t||1e-6);}
function ck(name,cond){if(cond){pass++;console.log('  ✓ '+name);}else{fail++;console.log('  ✗ '+name+'  FAILED');}}
function evalF(formula,cells){return XL.evalFormula(formula,cells||{});}

console.log('\n=== Excel engine ===\n');
// arithmetic & precedence
ck('arithmetic + precedence', near(evalF('=2+3*4'),14));
ck('power', near(evalF('=2^10'),1024));
ck('parentheses', near(evalF('=(2+3)*4'),20));
ck('percent', near(evalF('=50%'),0.5));
ck('unary minus', near(evalF('=-5+8'),3));

// cell refs + ranges
const cells={A1:{value:10},A2:{value:20},A3:{value:30},B1:{value:5}};
ck('cell ref', near(evalF('=A1+A2',cells),30));
ck('SUM range A1:A3', near(evalF('=SUM(A1:A3)',cells),60));
ck('AVERAGE range', near(evalF('=AVERAGE(A1:A3)',cells),20));
ck('MIN/MAX', near(evalF('=MAX(A1:A3)-MIN(A1:A3)',cells),20));
ck('mixed args', near(evalF('=SUM(A1:A3,B1,5)',cells),70));

// IF / logic
ck('IF true', near(evalF('=IF(1>0,100,200)'),100));
ck('IF false', near(evalF('=IF(5<3,100,200)'),200));
ck('nested IF', near(evalF('=IF(A1>15,1,IF(A1>5,2,3))',cells),2));
ck('IFERROR catches div0', near(evalF('=IFERROR(1/0,42)'),42));
ck('AND/OR', evalF('=IF(AND(1>0,2>1),9,0)')===9 && evalF('=IF(OR(1>2,3>2),7,0)')===7);

// finance
ck('NPV (t0 not discounted convention)', near(evalF('=NPV(0.1,100,100,100)'),248.685,0.01));
ck('IRR doubling over 5y ≈14.87%', (function(){const c={A1:{value:-100},A2:{value:0},A3:{value:0},A4:{value:0},A5:{value:0},A6:{value:200}};return near(evalF('=IRR(A1:A6)',c),0.1487,0.001);})());
ck('IRR simple in/out', (function(){const c={A1:{value:-200},A2:{value:0},A3:{value:0},A4:{value:0},A5:{value:0},A6:{value:500}};return near(evalF('=IRR(A1:A6)',c),0.2011,0.001);})());
ck('NPV(rate,range)+t0 outlay', (function(){const c={};for(let i=1;i<=21;i++)c['A'+i]={value:i===1?-20:3};return near(evalF('=NPV(0.08,A2:A21)+A1',c),9.45,0.2);})());
ck('PMT', near(evalF('=PMT(0.05,10,1000)'),-129.50,0.5));
ck('ROUND', near(evalF('=ROUND(3.14159,2)'),3.14));
ck('ABS', near(evalF('=ABS(-7)'),7));

// evalSheet with dependent formula cells (what grading uses)
ck('evalSheet dependency chain', (function(){
  const sheet={B1:{value:415},B2:{value:32},B3:{value:200},B4:{formula:'=B1-B2'},B5:{formula:'=B4/B3'}};
  const out=XL.evalSheet(sheet);
  return near(out.B4,383) && near(out.B5,1.915,0.001);
})());
ck('evalSheet cycle guard', (function(){const out=XL.evalSheet({A1:{formula:'=A2'},A2:{formula:'=A1'}});return out.A1==='#CYCLE'||out.A2==='#CYCLE'||out.A1==='#ERR'||out.A2==='#ERR';})());
ck('unknown function → #NAME?', evalF('=FOOBAR(1)')==='#NAME?');

console.log('\n=== '+pass+' passed, '+fail+' failed ===\n');
process.exit(fail?1:0);
