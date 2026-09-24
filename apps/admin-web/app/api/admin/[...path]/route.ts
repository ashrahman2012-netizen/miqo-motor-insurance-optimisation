import {NextRequest,NextResponse} from "next/server";
import {API_URL} from "../../../lib";

export const dynamic="force-dynamic";

export async function GET(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){
  const token=request.cookies.get("miqo_admin_access")?.value;
  if(!token)return NextResponse.json({error:"ADMIN_AUTHENTICATION_REQUIRED"},{status:401});

  const {path}=await params;
  const url=new URL(API_URL+"/desktop-admin/"+path.map(encodeURIComponent).join("/"));
  request.nextUrl.searchParams.forEach((value,key)=>url.searchParams.append(key,value));

  const upstream=await fetch(url,{cache:"no-store",headers:{authorization:"Bearer "+token}});
  const body=await upstream.text();
  return new NextResponse(body,{
    status:upstream.status,
    headers:{
      "content-type":upstream.headers.get("content-type")??"application/json",
      "cache-control":"no-store",
    },
  });
}
