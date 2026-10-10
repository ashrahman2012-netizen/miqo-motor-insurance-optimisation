import { ValidationError } from "./errors.ts";

export type MultipartPart=Readonly<{
  name:string;
  filename:string|null;
  contentType:string|null;
  data:Buffer;
}>;

function boundaryFrom(contentType:string){
  const match=/boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary=(match?.[1]??match?.[2]??"").trim();
  if(!boundary)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["multipart boundary is required"]);
  if(boundary.length>200)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["multipart boundary is too long"]);
  return boundary;
}

function headerValue(headers:string,name:string){
  const prefix=`${name.toLowerCase()}:`;
  for(const line of headers.split("\r\n")){
    if(line.toLowerCase().startsWith(prefix))return line.slice(prefix.length).trim();
  }
  return null;
}

export function parseMultipartForm(body:Buffer,contentType:string):ReadonlyMap<string,MultipartPart>{
  if(!Buffer.isBuffer(body))throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["multipart body must be binary"]);
  const boundary=boundaryFrom(contentType);
  const delimiter=Buffer.from(`--${boundary}`);
  const headerSeparator=Buffer.from("\r\n\r\n");
  const parts=new Map<string,MultipartPart>();
  let cursor=body.indexOf(delimiter);
  if(cursor<0)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",["multipart boundary was not found"]);

  while(cursor>=0){
    cursor+=delimiter.length;
    if(body.subarray(cursor,cursor+2).toString()==="--")break;
    if(body.subarray(cursor,cursor+2).toString()==="\r\n")cursor+=2;
    const headersEnd=body.indexOf(headerSeparator,cursor);
    if(headersEnd<0)break;
    const headers=body.subarray(cursor,headersEnd).toString("utf8");
    const next=body.indexOf(delimiter,headersEnd+headerSeparator.length);
    if(next<0)break;
    let dataEnd=next;
    if(body.subarray(dataEnd-2,dataEnd).toString()==="\r\n")dataEnd-=2;
    const disposition=headerValue(headers,"content-disposition")??"";
    const name=/\bname="([^"]+)"/i.exec(disposition)?.[1]??"";
    const filename=/\bfilename="([^"]*)"/i.exec(disposition)?.[1]??null;
    if(name){
      if(parts.has(name))throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`Duplicate multipart part: ${name}`]);
      parts.set(name,Object.freeze({
        name,
        filename,
        contentType:headerValue(headers,"content-type"),
        data:Buffer.from(body.subarray(headersEnd+headerSeparator.length,dataEnd)),
      }));
    }
    cursor=next;
  }
  return parts;
}

export function requiredMultipartPart(parts:ReadonlyMap<string,MultipartPart>,name:string,maxBytes:number){
  const part=parts.get(name);
  if(!part)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`Missing multipart part: ${name}`]);
  if(part.data.length===0)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${name} must not be empty`]);
  if(part.data.length>maxBytes)throw new ValidationError("INVALID_CUSTOMER_FORM_SUBMISSION",[`${name} exceeds ${maxBytes} bytes`]);
  return part;
}
