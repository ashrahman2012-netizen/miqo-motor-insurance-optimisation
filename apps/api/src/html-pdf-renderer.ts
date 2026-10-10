import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const WINDOWS_CANDIDATES=[
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const UNIX_CANDIDATES=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"];
const MAC_CANDIDATES=["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome","/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"];

async function executable(path:string){try{await access(path,constants.X_OK);return true;}catch{return false;}}

export async function resolveChromeExecutable(){
  const configured=process.env.MIQO_CHROME_EXECUTABLE?.trim();
  if(configured){
    if(await executable(configured))return configured;
    throw new Error(`MIQO_CHROME_EXECUTABLE is not executable: ${configured}`);
  }
  const candidates=process.platform==="win32"
    ? [...(process.env.LOCALAPPDATA?[join(process.env.LOCALAPPDATA,"Google","Chrome","Application","chrome.exe")]:[]),...WINDOWS_CANDIDATES]
    : process.platform==="darwin"?MAC_CANDIDATES:UNIX_CANDIDATES;
  for(const candidate of candidates)if(await executable(candidate))return candidate;
  throw new Error("No supported Chrome/Chromium executable was found. Set MIQO_CHROME_EXECUTABLE.");
}

function run(command:string,args:string[],timeoutMs=30_000){
  return new Promise<void>((resolve,reject)=>{
    const child=spawn(command,args,{stdio:["ignore","ignore","pipe"],windowsHide:true});
    let stderr="";
    child.stderr.on("data",chunk=>stderr+=String(chunk));
    const timer=setTimeout(()=>{child.kill();reject(new Error("PDF renderer timed out"));},timeoutMs);
    child.on("error",error=>{clearTimeout(timer);reject(error);});
    child.on("close",code=>{
      clearTimeout(timer);
      if(code===0)resolve();
      else reject(new Error(`PDF renderer exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

export async function renderHtmlToPdf(html:Buffer){
  if(!Buffer.isBuffer(html)||html.length===0)throw new Error("HTML snapshot is empty");
  const directory=await mkdtemp(join(tmpdir(),"miqos-pdf-"));
  const htmlPath=join(directory,"submission.html");
  const pdfPath=join(directory,"submission.pdf");
  try{
    await writeFile(htmlPath,html);
    const chrome=await resolveChromeExecutable();
    const args=[
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ];
    if(process.platform!=="win32")args.unshift("--no-sandbox");
    await run(chrome,args);
    const pdf=await readFile(pdfPath);
    if(pdf.length<5||pdf.subarray(0,5).toString("ascii")!=="%PDF-")throw new Error("Chrome did not create a valid PDF");
    return pdf;
  }finally{await rm(directory,{recursive:true,force:true});}
}
