import {readFileSync} from "node:fs";

const roadmap=JSON.parse(readFileSync("control-centre/roadmap.v2.json","utf8"));
const ledger=JSON.parse(readFileSync("control-centre/certification-ledger.v1.json","utf8"));
const risks=JSON.parse(readFileSync("control-centre/residual-risks.v1.json","utf8"));
const deps=JSON.parse(readFileSync("control-centre/external-dependencies.v1.json","utf8"));
const matrix=JSON.parse(readFileSync("control-centre/regression-matrix.v1.json","utf8"));

const failures=[];
const fail=(message)=>failures.push(message);
const stages=new Map(roadmap.stages.map(stage=>[stage.id,stage]));
const completedWeight=roadmap.stages
  .filter(stage=>stage.status==="PASS"&&stage.progress===100)
  .reduce((sum,stage)=>sum+Number(stage.weight||0),0);

const certifiedHead="d01536e76d3ec891be6078ef07955cd2ab8a219f";

if(roadmap.boundary!=="SYNTHETIC_ONLY")fail("roadmap boundary must remain SYNTHETIC_ONLY");
if(roadmap.progress.currentPercent!==98)fail("closed CC5 roadmap must be exactly 98%");
if(roadmap.progress.completedWeight!==98)fail("closed CC5 completedWeight must be exactly 98");
if(completedWeight!==98)fail(`PASS stage weights must total 98, got ${completedWeight}`);

const eh3=stages.get("EH3");
if(!eh3||eh3.status!=="PASS"||eh3.progress!==100)fail("EH3 must remain PASS/100");
const int1=stages.get("INT1");
if(!int1||int1.status!=="WAITING_EXTERNAL"||int1.progress!==0)fail("INT1 must remain WAITING_EXTERNAL/0");
const cc5=stages.get("CC5");
if(!cc5||cc5.status!=="PASS"||cc5.progress!==100||cc5.gate!=="CLOSED")fail("CC5 must be PASS/100/CLOSED");
if(roadmap.progress.currentPercent===100)fail("programme cannot be 100 while INT1 is unresolved");
if(roadmap.certifiedControlHead!==certifiedHead)fail("CC5 certified control head mismatch");
if(roadmap.certifiedControlStage!=="CC5")fail("certified control stage must be CC5");

const stageIds=new Set(roadmap.stages.map(stage=>stage.id));
const ledgerIds=new Set();
for(const item of ledger.stages??[]){
  if(ledgerIds.has(item.stageId))fail(`duplicate certification stage ${item.stageId}`);
  ledgerIds.add(item.stageId);
  if(!stageIds.has(item.stageId))fail(`ledger stage missing from roadmap: ${item.stageId}`);
  if(!/^[0-9a-f]{40}$/i.test(item.certifiedHead??""))fail(`invalid certified head for ${item.stageId}`);
  if(item.status!=="CLOSED")fail(`ledger stage not closed: ${item.stageId}`);
}
const cc5Ledger=ledger.stages?.find(item=>item.stageId==="CC5");
if(!cc5Ledger)fail("CC5 certification ledger entry is required");
else{
  if(cc5Ledger.certifiedHead!==certifiedHead)fail("CC5 ledger head mismatch");
  if(cc5Ledger.evidence?.controlCentreRunId!==37217900907)fail("CC5 control-centre evidence mismatch");
  if(cc5Ledger.evidence?.ciRunId!==37217900912)fail("CC5 CI evidence mismatch");
}
if("pendingStage" in ledger)fail("CC5 must not remain pending after certification");

const dependency=deps.dependencies?.find(item=>item.dependencyId==="INT1");
if(!dependency||dependency.status!=="WAITING_EXTERNAL"||dependency.programmeWeight!==2||dependency.progress!==0){
  fail("INT1 external dependency register is inconsistent");
}
if(!risks.items?.some(item=>item.id==="RR-01"&&item.status==="OPEN"&&item.relatedStage==="INT1")){
  fail("RR-01 external dependency risk is required");
}
if(matrix.boundary?.dataClassification!=="SYNTHETIC_ONLY"||matrix.boundary?.liveProvidersEnabled!==false){
  fail("regression matrix must remain synthetic-only with live providers disabled");
}
for(const gate of matrix.gates??[]){
  if(gate.certification?.conclusion!=="PASS")fail(`gate ${gate.id} lacks PASS certification`);
  if(!/^[0-9a-f]{40}$/i.test(gate.certification?.head??""))fail(`gate ${gate.id} has invalid head`);
  if(!Number.isInteger(gate.certification?.runId)||gate.certification.runId<=0)fail(`gate ${gate.id} has invalid runId`);
}
const matrixById=new Map((matrix.gates??[]).map(g=>[g.id,g]));
if(matrixById.get("ci")?.certification?.head!==certifiedHead||matrixById.get("ci")?.certification?.runId!==37217900912){
  fail("final CI certification evidence mismatch");
}
if(matrixById.get("control-centre")?.certification?.head!==certifiedHead||matrixById.get("control-centre")?.certification?.runId!==37217900907){
  fail("final control-centre certification evidence mismatch");
}

if(failures.length){
  console.error("CC5 control-plane closure verification FAILED");
  for(const failure of failures)console.error("- "+failure);
  process.exit(1);
}
console.log("CC5 closure verification PASS: programme 98%, CC5 certified, INT1 external, synthetic-only boundary intact");
