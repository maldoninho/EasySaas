import type { FastifyInstance } from "fastify";

import { query } from "@easysaas/database";
import { ok } from "../lib/http.js";
import { env } from "@easysaas/config";
import { getSecurityPolicy } from "../services/security-policy.js";

export async function publicRoutes(app:FastifyInstance):Promise<void>{
  app.get("/api/v1/public/captcha",async(_request,reply)=>{const policy=await getSecurityPolicy();return ok(reply,{mode:policy.captchaMode,provider:env.captchaProvider,siteKey:env.captchaProvider==="turnstile"?env.captchaSiteKey:undefined,publicSignup:policy.publicSignup});});
  app.get("/",async(_request,reply)=>ok(reply,{service:"easysaas-api",version:"1.0.0"}));
  app.get("/api/v1/health",async(_request,reply)=>ok(reply,{status:"ok",service:"api",version:"1.0.0",timestamp:new Date().toISOString()}));
  app.get("/api/v1/ready",async(request,reply)=>{ try{await query("SELECT 1");return ok(reply,{status:"ready",database:"ok",timestamp:new Date().toISOString()});}catch(error){request.log.error({err:error},"Readiness failed");return reply.status(503).send({error:{code:"SERVICE_NOT_READY",message:"O serviço ainda não está pronto.",requestId:request.id}});} });
  app.get("/api/v1/public/landing",async(_request,reply)=>{
    const page=await query<{enabled:boolean;seo:unknown;status:string}>("SELECT enabled,seo,status FROM landing_pages WHERE id=true");
    const enabled=(page.rows[0]?.enabled??env.landingEnabled)&&page.rows[0]?.status==="published";
    const sections=enabled?(await query("SELECT id,type,name,content,sort_order FROM landing_sections WHERE enabled=true ORDER BY sort_order")).rows:[];
    const company=(await query("SELECT company_name,logo_path,locale,branding FROM company_settings WHERE id=true")).rows[0];
    const modules=(await query("SELECT stable_id,visual_name,description,icon FROM app_modules WHERE status='active' AND visible=true ORDER BY sort_order,visual_name LIMIT 12")).rows;
    return ok(reply,{enabled,seo:page.rows[0]?.seo??{},company,sections,modules});
  });
  app.get("/api/v1/public/legal/:type",async(request,reply)=>{ const type=(request.params as {type:string}).type; const key=type==="privacy"?"privacy_policy":type==="terms"?"terms_of_use":""; if(!key)return reply.status(404).send({error:{code:"NOT_FOUND",message:"Documento não encontrado.",requestId:request.id}}); const result=await query<{value:unknown}>("SELECT value FROM system_settings WHERE key=$1",[key]); return ok(reply,{type,content:result.rows[0]?.value??{title:type==="privacy"?"Política de Privacidade":"Termos de Uso",body:"Documento ainda não configurado."}}); });
}
