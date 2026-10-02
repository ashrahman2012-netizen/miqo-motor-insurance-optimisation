function encodeRepoPath(path){
  return path.split("/").map(encodeURIComponent).join("/");
}

function parseResponseBody(text){
  if(!text)return null;
  try{return JSON.parse(text)}catch{return text}
}

export function createGitHubWriter({config,roadmap,auth,fetchImpl=fetch}){
  const configured=Boolean(auth?.token);

  async function request(method,path,body){
    if(!configured)throw Object.assign(new Error("CC3_WRITE_IDENTITY_NOT_CONFIGURED"),{statusCode:503});
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),config.requestTimeoutMs);
    try{
      const headers={
        Accept:"application/vnd.github+json",
        "X-GitHub-Api-Version":"2022-11-28",
        "User-Agent":"MIQOS-Control-Centre-CC3",
        Authorization:"Bearer "+auth.token,
      };
      if(body!==undefined)headers["Content-Type"]="application/json";
      const response=await fetchImpl("https://api.github.com/repos/"+roadmap.repository+path,{
        method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,
      });
      const text=await response.text();
      const parsed=parseResponseBody(text);
      if(!response.ok){
        const error=new Error("GITHUB_WRITE_HTTP_"+response.status);
        error.statusCode=response.status;
        error.details=parsed;
        throw error;
      }
      return parsed;
    }finally{
      clearTimeout(timeout);
    }
  }

  async function getRef(branch){
    return request("GET","/git/ref/heads/"+encodeURIComponent(branch));
  }

  async function createBranch(branch,sha){
    try{
      const existing=await getRef(branch);
      const existingSha=existing?.object?.sha??null;
      if(existingSha===sha)return {created:false,idempotent:true,branch,sha};
      const error=new Error("CONTROLLED_BRANCH_EXISTS_DIFFERENT_HEAD");
      error.statusCode=409;
      error.details={branch,expectedSha:sha,actualSha:existingSha};
      throw error;
    }catch(error){
      if(error.message!=="GITHUB_WRITE_HTTP_404")throw error;
    }
    const result=await request("POST","/git/refs",{ref:"refs/heads/"+branch,sha});
    return {created:true,idempotent:false,branch,sha:result?.object?.sha??sha};
  }

  async function upsertFile({branch,path,content,message}){
    let currentSha;
    try{
      const current=await request("GET","/contents/"+encodeRepoPath(path)+"?ref="+encodeURIComponent(branch));
      currentSha=current?.sha;
    }catch(error){
      if(error.message!=="GITHUB_WRITE_HTTP_404")throw error;
    }
    const body={
      message,
      content:Buffer.from(content,"utf8").toString("base64"),
      branch,
    };
    if(currentSha)body.sha=currentSha;
    const result=await request("PUT","/contents/"+encodeRepoPath(path),body);
    return {
      path,
      branch,
      previousBlobSha:currentSha??null,
      commitSha:result?.commit?.sha??null,
      contentSha:result?.content?.sha??null,
    };
  }

  async function dispatchWorkflow({workflow,ref,inputs={}}){
    await request("POST","/actions/workflows/"+encodeURIComponent(workflow)+"/dispatches",{ref,inputs});
    return {workflow,ref,dispatched:true};
  }

  async function openPullRequest({head,base,title,body,draft=true}){
    try{
      const result=await request("POST","/pulls",{head,base,title,body,draft});
      return {created:true,number:result.number,url:result.html_url,head,base};
    }catch(error){
      if(error.message!=="GITHUB_WRITE_HTTP_422")throw error;
      const owner=roadmap.repository.split("/")[0];
      const pulls=await request(
        "GET",
        "/pulls?state=open&head="+encodeURIComponent(owner+":"+head)+"&base="+encodeURIComponent(base)
      );
      const existing=Array.isArray(pulls)?pulls[0]:null;
      if(!existing)throw error;
      return {created:false,number:existing.number,url:existing.html_url,head,base,idempotent:true};
    }
  }

  async function commentIssue({issueNumber,body}){
    const result=await request("POST","/issues/"+issueNumber+"/comments",{body});
    return {issueNumber,commentId:result.id,url:result.html_url};
  }

  async function getPullRequest(number){
    return request("GET","/pulls/"+number);
  }

  async function closePullRequest(number){
    const result=await request("PATCH","/pulls/"+number,{state:"closed"});
    return {number:result.number,state:result.state,url:result.html_url};
  }

  return {
    state(){
      return {
        state:configured?"CONFIGURED":"NOT_CONFIGURED",
        authSource:configured?auth.source:null,
        mutationsEnabled:Boolean(config.cc3WritesEnabled&&configured),
      };
    },
    getRef,createBranch,upsertFile,dispatchWorkflow,openPullRequest,
    commentIssue,getPullRequest,closePullRequest,
  };
}
