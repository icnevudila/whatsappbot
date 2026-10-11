'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const {source,root,refs}=require('./source.cjs');
const file='scripts/master_60_acceptance_runner.mjs';
const code=source('master',file);
const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const spans={};
function walk(node){
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='recordTest'){
    const id=node.arguments[0],body=node.arguments[1];
    const ids=ts.isStringLiteral(id)?[id.text]:['A48','A49','A50','A51','A52'];
    for(const key of ids) spans[key]={start:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,end:ast.getLineAndCharacterOfPosition(node.end).line+1,body:body.getText(ast)};
  }
  ts.forEachChild(node,walk);
}
walk(ast);
const imported=JSON.parse(source('master','docs/evidence/master_60_acceptance/latest_results.json'));
const staticIDs=new Set([19,20,22,23,24,36,42,43,54,56,57]);
const unitIDs=new Set([13,14,15,16,17,18,55]);
const unverifiedIDs=new Set([11,12,35,38,53,58,59,60]);
const special={
  A02:'Checks select value; does not assert cookie synchronization.',
  A03:'Reload only; no second tab or isolated session.',
  A06:'Existing logo label can pass; missing-logo rejection not exercised.',
  A07:'Product heading only; invalid/missing reference rejection not exercised.',
  A08:'Button existence only; no disabled/precondition assertions.',
  A09:'Any matching button suffices; all aspect ratios not selected.',
  A10:'Tab existence only; no generated 9:16 output.',
  A11:'Optional branch can do nothing; no fallback assertion.',
  A12:'Optional input fill; no delayed AI race or retained-value assertion.',
  A18:'Tone registry length and two action names; no five actual rewrites.',
  A19:'Checks a local ref assignment; no two-tab/server duplicate test.',
  A20:'Checks stableSubmissionId substring; no persisted unique job count.',
  A21:'Quota text presence only; no quota enforcement.',
  A23:'shouldObserveRender substring; no pending-job F5 replay.',
  A24:'Rejects conjunction of Math.random and ETA; not actual timing truth.',
  A26:'206 only; no exact bytes, Content-Range validity or expiry.',
  A31:'Frame time plus screenshot; no original-logo/outro quality assertion.',
  A33:'Fetch source and content-length; not browser download action.',
  A35:'Logs badge count with no expectation.',
  A36:'Documentation phrase only; not media quality validation.',
  A38:'Logs URL; no clean URL or creative_id preservation assertion.',
  A40:'Exact local browser text survives reload; database draft save not invoked.',
  A43:'Action name substring; database insert/read-back not executed.',
  A44:'Manually repairs cookie if switch failed, masking synchronization defects.',
  A45:'Brand-word scan can miss arbitrary cross-tenant media.',
  A46:'UI 404 check; direct preview/download/blob negative API tests absent.',
  A53:'Original desktop page, 40px not 44px; empty selector set passes.',
  A57:'Reads scanner and checks process.exit(1); scanner never executed.',
  A58:'Reads source and logs; no send spy/network deny.',
  A59:'Log only; no payment/network evidence.',
  A60:'Log only; no paid-provider/network evidence.'
};
const rows=Object.entries(imported.matrix).map(([id,result])=>{
  const number=Number(id.slice(1));
  const category=staticIDs.has(number)?'STATIC_CODE_CHECK':unitIDs.has(number)?'UNIT_TEST':unverifiedIDs.has(number)?'UNVERIFIED':'REAL_BROWSER_E2E';
  const note=special[id]||(number>=48&&number<=52?'Overflow check on library only; swallowed article timeout; not full mobile journey.':'Limited browser assertion; historical result, not independently rerun.');
  return {id,name:result.name,reported:result.status,category,lineStart:spans[id]?.start,lineEnd:spans[id]?.end,note,artifacts:result.artifacts.map(x=>path.basename(x.replace(/\\/g,'/')))};
});
const counts={};for(const row of rows)counts[row.category]=(counts[row.category]||0)+1;
const out=path.join(root,'docs/integration-readiness/evidence');
fs.writeFileSync(path.join(out,'master-test-truth.json'),JSON.stringify({sha:refs.master,runId:imported.runId,reportedPassed:imported.passed,counts,rows},null,2)+'\n');
console.log(JSON.stringify({counts,total:rows.length,reportedPassed:imported.passed},null,2));
