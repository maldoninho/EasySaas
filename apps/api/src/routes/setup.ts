import type { FastifyInstance } from "fastify";
import { env } from "@easysaas/config";
import { writeAudit } from "@easysaas/core";
import { query, transaction } from "@easysaas/database";
import { constantTimeEqual, hashIp, hashPassword, validatePassword } from "@easysaas/security";
import { assert, email, jsonBody, ok, text } from "../lib/http.js";
import { createSession } from "../services/session.js";

function isLoopback(ip:string):boolean { return ip==="127.0.0.1"||ip==="::1"||ip==="::ffff:127.0.0.1"; }
function originalClientIp(request:import("fastify").FastifyRequest):string {
  const forwarded=request.headers["x-forwarded-for"];
  const first=Array.isArray(forwarded)?forwarded[0]:forwarded?.split(",")[0]?.trim();
  return first||request.ip;
}
export async function setupRoutes(app:FastifyInstance):Promise<void>{
  app.get("/api/v1/setup/status",async(_request,reply)=>{
    const result=await query<{complete:boolean}>("SELECT COALESCE((value->>'setupComplete')::boolean,false) complete FROM system_settings WHERE key='installation'");
    return ok(reply,{setupComplete:result.rows[0]?.complete??false});
  });
  app.post("/api/v1/setup/owner",{config:{rateLimit:{max:5,timeWindow:"15 minutes"}}},async(request,reply)=>{
    assert(isLoopback(originalClientIp(request)),403,"SETUP_LOCAL_ONLY","O primeiro acesso só pode ser concluído localmente no servidor.");
    const supplied=request.headers["x-setup-token"]; assert(typeof supplied==="string"&&constantTimeEqual(supplied,env.setupToken),403,"SETUP_TOKEN_INVALID","Token de configuração inválido.");
    const body=jsonBody(request); const userEmail=email(body.email); const name=text(body.name,"Nome",2,100); const password=text(body.password,"Senha",12,128);
    const passwordErrors=validatePassword(password); assert(passwordErrors.length===0,400,"WEAK_PASSWORD","A senha não atende aos requisitos.",passwordErrors);
    const userId=await transaction(async(client)=>{
      const state=await client.query<{complete:boolean}>("SELECT COALESCE((value->>'setupComplete')::boolean,false) complete FROM system_settings WHERE key='installation' FOR UPDATE");
      assert(!state.rows[0]?.complete,409,"SETUP_ALREADY_COMPLETE","A instalação já possui proprietário.");
      const ownerCount=await client.query("SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.is_owner=true LIMIT 1"); assert(ownerCount.rowCount===0,409,"OWNER_EXISTS","Já existe um proprietário.");
      const hash=await hashPassword(password);
      const user=await client.query<{id:string}>("INSERT INTO users(email,password_hash,name,status,email_verified_at,password_changed_at) VALUES ($1,$2,$3,'active',now(),now()) RETURNING id",[userEmail,hash,name]);
      await client.query("INSERT INTO user_preferences(user_id) VALUES ($1)",[user.rows[0]!.id]);
      await client.query("INSERT INTO user_roles(user_id,role_id,assigned_by) SELECT $1,id,$1 FROM roles WHERE key='owner'",[user.rows[0]!.id]);
      await client.query("UPDATE system_settings SET value=jsonb_set(value,'{setupComplete}','true'::jsonb),updated_at=now() WHERE key='installation'");
      return user.rows[0]!.id;
    });
    await writeAudit({actorUserId:userId,action:"installation.owner.created",targetType:"user",targetId:userId,requestId:request.id,ipHash:hashIp(request.ip,env.sessionSecret)});
    await createSession({userId,request,reply}); return ok(reply,{created:true,redirectTo:"/admin"},201);
  });
}
