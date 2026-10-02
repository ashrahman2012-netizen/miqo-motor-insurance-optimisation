import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE=dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT=resolve(HERE,"../..");
export const DEFAULT_ROADMAP=join(REPO_ROOT,"control-centre","roadmap.v2.json");
export const DEFAULT_ALLOWLIST=join(HERE,"actions.allowlist.v2.json");
export const DEFAULT_ACTION_POLICY=join(HERE,"action-policy.v1.json");
export const DEFAULT_ACTION_STORE=join(REPO_ROOT,"data","control-centre-broker","actions.json");

export function safeString(value){
  return typeof value==="string"?value.trim():"";
}

export function runGit(args,cwd=REPO_ROOT){
  try{
    return execFileSync("git",args,{cwd,encoding:"utf8",windowsHide:true,stdio:["ignore","pipe","ignore"]}).trim();
  }catch{
    return null;
  }
}

export function localGitState(){
  const status=runGit(["status","--porcelain"]);
  return {
    repositoryRoot:runGit(["rev-parse","--show-toplevel"]),
    branch:runGit(["branch","--show-current"]),
    head:runGit(["rev-parse","HEAD"]),
    dirty:status===null?null:status.length>0,
  };
}

export function detectGitHubToken(){
  for(const [source,value] of [
    ["MIQOS_GITHUB_TOKEN",process.env.MIQOS_GITHUB_TOKEN],
    ["GITHUB_TOKEN",process.env.GITHUB_TOKEN],
    ["GH_TOKEN",process.env.GH_TOKEN],
  ]){
    if(safeString(value))return {token:value.trim(),source};
  }
  if(process.env.MIQOS_DISABLE_GH_CLI==="1")return {token:null,source:null};
  try{
    const token=execFileSync("gh",["auth","token"],{
      encoding:"utf8",windowsHide:true,stdio:["ignore","pipe","ignore"],
    }).trim();
    if(token)return {token,source:"gh-cli"};
  }catch{
    // Public repositories remain readable through GitHub's unauthenticated API.
  }
  return {token:null,source:null};
}

export function detectGitHubWriteToken(){
  for(const [source,value] of [
    ["github-app-installation",process.env.MIQOS_GITHUB_APP_INSTALLATION_TOKEN],
    ["dedicated-write-token",process.env.MIQOS_GITHUB_WRITE_TOKEN],
  ]){
    if(safeString(value))return {token:value.trim(),source};
  }
  return {token:null,source:null};
}

export function createConfig(overrides={}){
  return {
    host:"127.0.0.1",
    port:Number(overrides.port??process.env.MIQOS_BROKER_PORT??4300),
    roadmapPath:overrides.roadmapPath??process.env.MIQOS_ROADMAP_PATH??DEFAULT_ROADMAP,
    allowlistPath:overrides.allowlistPath??process.env.MIQOS_ACTION_ALLOWLIST_PATH??DEFAULT_ALLOWLIST,
    actionPolicyPath:overrides.actionPolicyPath??process.env.MIQOS_ACTION_POLICY_PATH??DEFAULT_ACTION_POLICY,
    actionStorePath:overrides.actionStorePath??process.env.MIQOS_ACTION_STORE_PATH??DEFAULT_ACTION_STORE,
    githubMode:overrides.githubMode??process.env.MIQOS_GITHUB_MODE??"network",
    allowSnapshotHead:Boolean(overrides.allowSnapshotHead??process.env.MIQOS_ALLOW_SNAPSHOT_HEAD==="1"),
    cc3WritesEnabled:Boolean(overrides.cc3WritesEnabled??process.env.MIQOS_CC3_WRITES_ENABLED==="1"),
    issueNumbers:overrides.issueNumbers??[19,15],
    workflowLimit:Number(overrides.workflowLimit??8),
    openAiModel:overrides.openAiModel??process.env.MIQOS_OPENAI_MODEL??"",
    openAiApiKey:overrides.openAiApiKey??process.env.OPENAI_API_KEY??"",
    requestTimeoutMs:Number(overrides.requestTimeoutMs??12000),
  };
}
