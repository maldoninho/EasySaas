import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "@easysaas/config";
export async function registerSecurity(app:FastifyInstance):Promise<void>{
  await app.register(cookie,{secret:env.sessionSecret});
  await app.register(helmet,{contentSecurityPolicy:false,crossOriginResourcePolicy:{policy:"same-site"}});
  await app.register(rateLimit,{max:200,timeWindow:"1 minute",keyGenerator:(request:FastifyRequest)=>request.ip});
  await app.register(multipart,{limits:{fileSize:env.maxUploadMb*1024*1024,files:1,fields:20}});
  app.addHook("onRequest",async(request,reply)=>{
    const origin=request.headers.origin; if(origin&&origin!==env.appUrl) return reply.status(403).send({error:{code:"ORIGIN_DENIED",message:"Origem não permitida.",requestId:request.id}});
    reply.header("x-content-type-options","nosniff"); reply.header("referrer-policy","strict-origin-when-cross-origin"); reply.header("permissions-policy","camera=(), microphone=(), geolocation=()");
  });
}
