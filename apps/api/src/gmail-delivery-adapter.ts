import { randomUUID } from "node:crypto";

export type EmailAttachment=Readonly<{filename:string;contentType:string;data:Buffer}>;
export type GmailDeliveryInput=Readonly<{
  subject:string;
  textBody:string;
  attachments:readonly EmailAttachment[];
}>;

function requiredEnv(name:string){
  const value=process.env[name]?.trim();
  if(!value)throw new Error(`${name} is required for Gmail delivery`);
  return value;
}
function base64Lines(data:Buffer){return data.toString("base64").match(/.{1,76}/g)?.join("\r\n")??"";}
function base64Url(value:string){return Buffer.from(value,"utf8").toString("base64url");}
function safeHeader(value:string){return value.replace(/[\r\n]+/g," ").trim();}

async function accessToken(){
  const clientId=requiredEnv("MIQO_GMAIL_CLIENT_ID");
  const clientSecret=requiredEnv("MIQO_GMAIL_CLIENT_SECRET");
  const refreshToken=requiredEnv("MIQO_GMAIL_REFRESH_TOKEN");
  const body=new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"});
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
  const json:any=await response.json().catch(()=>({}));
  if(!response.ok||!json.access_token)throw new Error(`Gmail OAuth token refresh failed (${response.status})`);
  return String(json.access_token);
}

export function buildMimeMessage(input:GmailDeliveryInput){
  const sender=process.env.MIQO_GMAIL_SENDER?.trim()||"miqos.new@gmail.com";
  const recipient=process.env.MIQO_GMAIL_RECIPIENT?.trim()||"miqos.new@gmail.com";
  const boundary=`miqos_${randomUUID().replaceAll("-","")}`;
  const lines=[
    `From: MIQOS <${safeHeader(sender)}>`,
    `To: ${safeHeader(recipient)}`,
    `Subject: ${safeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.textBody,
  ];
  for(const attachment of input.attachments){
    const filename=safeHeader(attachment.filename).replaceAll('"',"'");
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      base64Lines(attachment.data),
    );
  }
  lines.push(`--${boundary}--`,"");
  return lines.join("\r\n");
}

export async function sendGmailWithAttachments(input:GmailDeliveryInput){
  const token=await accessToken();
  const raw=base64Url(buildMimeMessage(input));
  const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{
    method:"POST",
    headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},
    body:JSON.stringify({raw}),
  });
  const json:any=await response.json().catch(()=>({}));
  if(!response.ok||!json.id)throw new Error(`Gmail send failed (${response.status})`);
  return Object.freeze({provider:"gmail",messageId:String(json.id),recipient:process.env.MIQO_GMAIL_RECIPIENT?.trim()||"miqos.new@gmail.com"});
}
