import type {NextConfig} from "next";

const contentSecurityPolicy=[
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:4000 ws://127.0.0.1:3000 ws://127.0.0.1:3001"
].join("; ");

const securityHeaders=[
  {key:"Content-Security-Policy",value:contentSecurityPolicy},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"Referrer-Policy",value:"no-referrer"},
  {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
  {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
  {key:"Cross-Origin-Resource-Policy",value:"same-site"}
];

const nextConfig:NextConfig={
  poweredByHeader:false,
  async headers(){
    return [{source:"/:path*",headers:securityHeaders}];
  }
};

export default nextConfig;
