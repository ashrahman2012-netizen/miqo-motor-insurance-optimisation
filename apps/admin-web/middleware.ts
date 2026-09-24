import {NextRequest,NextResponse} from "next/server";

const COOKIE_NAME="miqo_synthetic_admin";

export function middleware(request:NextRequest){
  const classification=process.env.MIQO_DATA_CLASSIFICATION??"";
  const gate=process.env.MIQO_SYNTHETIC_ADMIN_GATE??"";
  if(classification!=="SYNTHETIC"||!gate){
    return new NextResponse("Synthetic admin gate unavailable",{status:503});
  }
  const supplied=request.nextUrl.searchParams.get("syntheticAdmin");
  if(supplied===gate){
    const clean=request.nextUrl.clone();
    clean.searchParams.delete("syntheticAdmin");
    const response=NextResponse.redirect(clean);
    response.cookies.set(COOKIE_NAME,gate,{httpOnly:true,sameSite:"strict",path:"/"});
    return response;
  }
  if(request.cookies.get(COOKIE_NAME)?.value===gate)return NextResponse.next();
  return new NextResponse("Synthetic admin access required",{status:401});
}

export const config={matcher:["/admin/:path*"]};
