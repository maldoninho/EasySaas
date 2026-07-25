import type { NextConfig } from "next";
import { resolve } from "node:path";
const apiUrl=process.env.API_INTERNAL_URL??"http://127.0.0.1:4000";
const config:NextConfig={
  output:"standalone",
  outputFileTracingRoot:resolve(process.cwd(),"../.."),
  transpilePackages:["@easysaas/contracts","@easysaas/ui","@easysaas/module-sdk"],
  experimental:{turbopackFileSystemCacheForDev:true},
  turbopack:{root:resolve(process.cwd(),"../..")},
  async rewrites(){return [{source:"/api/:path*",destination:`${apiUrl}/api/:path*`}];},
  async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}]}];}
};
export default config;
