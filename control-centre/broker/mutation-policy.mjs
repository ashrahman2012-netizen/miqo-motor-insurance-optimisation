const MUTATION_TYPES=new Set([
  "create_branch",
  "update_file",
  "dispatch_workflow",
  "open_validation_pr",
  "comment_issue",
  "close_validation_pr",
]);

function fail(code,details){
  const error=new Error(code);
  error.statusCode=400;
  error.details=details;
  throw error;
}

function matchesPath(path,allowed){
  return allowed.some(rule=>{
    if(rule.endsWith("/**"))return path.startsWith(rule.slice(0,-3));
    if(rule.endsWith("*"))return path.startsWith(rule.slice(0,-1));
    return path===rule;
  });
}

function controlledBranch(branch,prefix){
  return typeof branch==="string"
    &&branch.startsWith(prefix)
    &&branch!=="main"
    &&branch!=="master";
}

export function validateWritePlan(packet,actionPolicy,config){
  const plan=packet?.writePlan;
  if(!packet?.idempotencyKey||!/^[A-Za-z0-9._:-]{8,160}$/.test(packet.idempotencyKey)){
    fail("CC3_IDEMPOTENCY_KEY_REQUIRED");
  }
  if(!plan||!Array.isArray(plan.operations)||plan.operations.length<1){
    fail("CC3_WRITE_PLAN_REQUIRED");
  }
  if(plan.operations.length>20)fail("CC3_TOO_MANY_OPERATIONS");

  const rule=actionPolicy.actions?.[packet.actionId];
  if(!rule||rule.enabled!==true)fail("CC3_ACTION_POLICY_NOT_ENABLED",{actionId:packet.actionId});

  const controlledBranches=new Set();
  for(const [index,op] of plan.operations.entries()){
    if(!op||!MUTATION_TYPES.has(op.type)){
      fail("CC3_OPERATION_NOT_ALLOWED",{index,type:op?.type});
    }
    if(!rule.allowedOperations.includes(op.type)){
      fail("CC3_OPERATION_OUTSIDE_ACTION_POLICY",{index,type:op.type});
    }

    if(op.type==="create_branch"){
      if(!controlledBranch(op.branch,rule.branchPrefix)){
        fail("CC3_BRANCH_OUTSIDE_NAMESPACE",{index,branch:op.branch});
      }
      if(op.baseSha!==packet.expectedHead){
        fail("CC3_BRANCH_BASE_MUST_MATCH_EXPECTED_HEAD",{index,baseSha:op.baseSha});
      }
      controlledBranches.add(op.branch);
    }

    if(op.type==="update_file"){
      if(!controlledBranch(op.branch,rule.branchPrefix)){
        fail("CC3_FILE_BRANCH_OUTSIDE_NAMESPACE",{index,branch:op.branch});
      }
      if(typeof op.path!=="string"||!matchesPath(op.path,rule.allowedPaths)){
        fail("CC3_FILE_PATH_OUTSIDE_SCOPE",{index,path:op.path});
      }
      if(typeof op.content!=="string"||Buffer.byteLength(op.content,"utf8")>rule.maxFileBytes){
        fail("CC3_FILE_CONTENT_TOO_LARGE",{index,path:op.path});
      }
    }

    if(op.type==="dispatch_workflow"){
      if(!controlledBranch(op.ref,rule.branchPrefix)){
        fail("CC3_WORKFLOW_REF_OUTSIDE_NAMESPACE",{index,ref:op.ref});
      }
      if(!rule.allowedWorkflows.includes(op.workflow)){
        fail("CC3_WORKFLOW_OUTSIDE_SCOPE",{index,workflow:op.workflow});
      }
    }

    if(op.type==="open_validation_pr"){
      if(!controlledBranch(op.head,rule.branchPrefix)){
        fail("CC3_PR_HEAD_OUTSIDE_NAMESPACE",{index,head:op.head});
      }
      if(!rule.allowedPrBases.includes(op.base)){
        fail("CC3_PR_BASE_OUTSIDE_SCOPE",{index,base:op.base});
      }
      if(typeof op.title!=="string"||op.title.length<4||op.title.length>180){
        fail("CC3_PR_TITLE_INVALID",{index});
      }
    }

    if(op.type==="comment_issue"){
      if(!rule.allowedIssueNumbers.includes(Number(op.issueNumber))){
        fail("CC3_ISSUE_OUTSIDE_SCOPE",{index,issueNumber:op.issueNumber});
      }
      if(typeof op.body!=="string"||op.body.length<1||op.body.length>12000){
        fail("CC3_COMMENT_INVALID",{index});
      }
    }

    if(op.type==="close_validation_pr"){
      if(!Number.isInteger(Number(op.prNumber))||Number(op.prNumber)<1){
        fail("CC3_PR_NUMBER_INVALID",{index});
      }
    }
  }

  const fileOps=plan.operations.filter(op=>op.type==="update_file");
  if(fileOps.length>(rule.maxFiles??8))fail("CC3_TOO_MANY_FILE_CHANGES");

  return {rule,operations:plan.operations,controlledBranches:[...controlledBranches]};
}

export async function validateClosePr(writer,op,rule){
  const pr=await writer.getPullRequest(Number(op.prNumber));
  const head=pr?.head?.ref;
  const base=pr?.base?.ref;
  if(!controlledBranch(head,rule.branchPrefix)){
    fail("CC3_CLOSE_PR_HEAD_OUTSIDE_NAMESPACE",{prNumber:op.prNumber,head});
  }
  if(!rule.allowedPrBases.includes(base)){
    fail("CC3_CLOSE_PR_BASE_OUTSIDE_SCOPE",{prNumber:op.prNumber,base});
  }
  return pr;
}
