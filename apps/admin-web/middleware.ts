import {NextRequest,NextResponse} from "next/server";

const LEGACY_COOKIE_NAME="miqo_synthetic_admin";
const RUNTIME_COOKIE_NAME="miqo_runtime_capability";

export function middleware(request:NextRequest){
  const classification=process.env.MIQO_DATA_CLASSIFICATION??"";
  if(classification!=="SYNTHETIC"){
    return new NextResponse("Synthetic admin gate unavailable",{status:503});
  }

  const runtimeCapability=process.env.MIQO_LOCAL_RUNTIME_CAPABILITY??"";
  if(runtimeCapability){
    if(request.cookies.get(RUNTIME_COOKIE_NAME)?.value===runtimeCapability)return NextResponse.next();
    return new NextResponse("Local runtime capability required",{status:401});
  }

  const gate=process.env.MIQO_SYNTHETIC_ADMIN_GATE??"";
  if(!gate)return new NextResponse("Synthetic admin gate unavailable",{status:503});
  const supplied=request.nextUrl.searchParams.get("syntheticAdmin");
  if(supplied===gate){
    const clean=request.nextUrl.clone();
    clean.searchParams.delete("syntheticAdmin");
    const response=NextResponse.redirect(clean);
    response.cookies.set(LEGACY_COOKIE_NAME,gate,{httpOnly:true,sameSite:"strict",path:"/"});
    return response;
  }
  if(request.cookies.get(LEGACY_COOKIE_NAME)?.value===gate)return NextResponse.next();
  return new NextResponse("Synthetic admin access required",{status:401});
}

export const config={matcher:["/admin/:path*"]};
