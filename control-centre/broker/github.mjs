import { localGitState } from "./config.mjs";

export async function githubFetchJson({config,repo,path,token}){
  if(config.githubMode==="offline")throw new Error("GITHUB_OFFLINE_MODE");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),config.requestTimeoutMs);
  try{
    const headers={
      Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28",
      "User-Agent":"MIQOS-Control-Centre-CC2",
    };
    if(token)headers["Authorization"]="Bearer "+token;
    const response=await fetch("https://api.github.com/repos/"+repo+path,{
      method:"GET",headers,signal:controller.signal,
    });
    const parsed=await response.json();
    if(!response.ok)throw new Error("GITHUB_HTTP_"+response.status);
    return parsed;
  }finally{
    clearTimeout(timeout);
  }
}

export function createGitHubReader({config,roadmap,auth}){
  let cache={at:0,value:null};
  const CACHE_TTL_MS=15000;

  async function resolveTargetHead({requireLive=false}={}){
    const local=localGitState();
    if(local.branch===roadmap.activeBranch&&/^[0-9a-f]{40}$/i.test(local.head??"")){
      return {head:local.head,source:"local-git",live:true};
    }
    try{
      const commits=await githubFetchJson({
        config,repo:roadmap.repository,
        path:"/commits?sha="+encodeURIComponent(roadmap.activeBranch)+"&per_page=1",
        token:auth.token,
      });
      const head=commits?.[0]?.sha;
      if(/^[0-9a-f]{40}$/i.test(head??""))return {head,source:"github",live:true};
    }catch(error){
      if(requireLive&&!config.allowSnapshotHead)throw error;
    }
    if(config.allowSnapshotHead&&/^[0-9a-f]{40}$/i.test(roadmap.activeHead??"")){
      return {head:roadmap.activeHead,source:"roadmap-snapshot",live:false};
    }
    if(requireLive)throw new Error("CURRENT_HEAD_UNAVAILABLE");
    return {head:roadmap.activeHead??null,source:"roadmap-snapshot",live:false};
  }

  async function snapshot({force=false}={}){
    if(!force&&cache.value&&Date.now()-cache.at<CACHE_TTL_MS)return cache.value;
    const local=localGitState();
    let value;
    try{
      const [repoInfo,commits,runs,issues]=await Promise.all([
        githubFetchJson({config,repo:roadmap.repository,path:"",token:auth.token}),
        githubFetchJson({
          config,repo:roadmap.repository,
          path:"/commits?sha="+encodeURIComponent(roadmap.activeBranch)+"&per_page=1",
          token:auth.token,
        }),
        githubFetchJson({
          config,repo:roadmap.repository,
          path:"/actions/runs?branch="+encodeURIComponent(roadmap.activeBranch)+"&per_page="+config.workflowLimit,
          token:auth.token,
        }),
        Promise.all(config.issueNumbers.map(async number=>{
          try{
            const issue=await githubFetchJson({
              config,repo:roadmap.repository,path:"/issues/"+number,token:auth.token,
            });
            return {number,title:issue.title,state:issue.state,updatedAt:issue.updated_at,url:issue.html_url};
          }catch(error){
            return {number,state:"UNAVAILABLE",error:error.message};
          }
        })),
      ]);

      const workflowRuns=(runs?.workflow_runs??[]).map(run=>({
        id:run.id,name:run.name,runNumber:run.run_number,event:run.event,
        status:run.status,conclusion:run.conclusion,headSha:run.head_sha,
        headBranch:run.head_branch,createdAt:run.created_at,updatedAt:run.updated_at,url:run.html_url,
      }));

      const jobs={};
      for(const run of workflowRuns.slice(0,4)){
        try{
          const response=await githubFetchJson({
            config,repo:roadmap.repository,
            path:"/actions/runs/"+run.id+"/jobs?per_page=100",token:auth.token,
          });
          jobs[String(run.id)]=(response?.jobs??[]).map(job=>({
            id:job.id,name:job.name,status:job.status,conclusion:job.conclusion,
            startedAt:job.started_at,completedAt:job.completed_at,url:job.html_url,
          }));
        }catch(error){
          jobs[String(run.id)]=[{status:"UNAVAILABLE",error:error.message}];
        }
      }

      value={
        connection:{
          state:"CONNECTED",
          authenticated:Boolean(auth.token),
          authSource:auth.token?auth.source:"public-readonly",
          mutationsEnabled:false,
        },
        repository:{
          fullName:repoInfo.full_name,private:Boolean(repoInfo.private),
          defaultBranch:repoInfo.default_branch,url:repoInfo.html_url,
        },
        target:{
          branch:roadmap.activeBranch,head:commits?.[0]?.sha??null,
          expectedHead:roadmap.activeHead,headMatchesRoadmap:commits?.[0]?.sha===roadmap.activeHead,
        },
        local,workflowRuns,jobs,issues,observedAt:new Date().toISOString(),
      };
    }catch(error){
      value={
        connection:{
          state:"DISCONNECTED",authenticated:Boolean(auth.token),
          authSource:auth.token?auth.source:null,mutationsEnabled:false,error:error.message,
        },
        target:{
          branch:roadmap.activeBranch,head:null,expectedHead:roadmap.activeHead,headMatchesRoadmap:null,
        },
        local,workflowRuns:[],jobs:{},issues:[],observedAt:new Date().toISOString(),
      };
    }
    cache={at:Date.now(),value};
    return value;
  }

  return {snapshot,resolveTargetHead};
}
