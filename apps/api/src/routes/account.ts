import type { FastifyInstance } from "fastify";
import * as OTPAuth from "otpauth";
import { env } from "@easysaas/config";
import { writeAudit } from "@easysaas/core";
import { query, transaction } from "@easysaas/database";
import { decryptSecret, encryptSecret, hashPassword, randomToken, tokenHash, validatePassword, verifyPassword } from "@easysaas/security";
import { assert, jsonBody, ok, optionalText, text } from "../lib/http.js";
import { requireAuth, requireAuthAndCsrf } from "../services/session.js";

export async function accountRoutes(app:FastifyInstance):Promise<void>{
  app.get("/api/v1/account/overview",{preHandler:requireAuth},async(request,reply)=>{const notifications=await query("SELECT id,type,title,body,data,read_at,created_at FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 10",[request.currentUser!.id]);const activity=await query("SELECT action,target_type,target_id,created_at FROM audit_events WHERE actor_user_id=$1 ORDER BY created_at DESC LIMIT 10",[request.currentUser!.id]);return ok(reply,{notifications:notifications.rows,activity:activity.rows});});
  app.post("/api/v1/account/notifications/:id/read",{preHandler:requireAuthAndCsrf},async(request,reply)=>{const id=(request.params as {id:string}).id;await query("UPDATE notifications SET read_at=now() WHERE id=$1 AND (user_id=$2 OR user_id IS NULL)",[id,request.currentUser!.id]);return ok(reply,{read:true});});
  app.get("/api/v1/account",{preHandler:requireAuth},async(request,reply)=>{
    const profile=await query("SELECT u.id,u.email::text,u.name,u.avatar_path,u.created_at,p.theme,p.locale,p.timezone,p.sidebar_collapsed,p.notifications,p.accessibility FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE u.id=$1",[request.currentUser!.id]);
    const mfa=await query("SELECT id,type,label,verified_at,created_at FROM mfa_credentials WHERE user_id=$1 ORDER BY created_at DESC",[request.currentUser!.id]); return ok(reply,{profile:profile.rows[0],mfa:mfa.rows});
  });
  app.patch("/api/v1/account",{preHandler:requireAuthAndCsrf},async(request,reply)=>{
    const body=jsonBody(request); const name=body.name===undefined?undefined:text(body.name,"Nome",2,100); const theme=optionalText(body.theme,20); const locale=optionalText(body.locale,20); const timezone=optionalText(body.timezone,80);
    await transaction(async(client)=>{if(name)await client.query("UPDATE users SET name=$1,updated_at=now() WHERE id=$2",[name,request.currentUser!.id]);await client.query(`INSERT INTO user_preferences(user_id,theme,locale,timezone) VALUES ($1,COALESCE($2,'system'),COALESCE($3,'pt-BR'),COALESCE($4,'America/Sao_Paulo')) ON CONFLICT(user_id) DO UPDATE SET theme=COALESCE($2,user_preferences.theme),locale=COALESCE($3,user_preferences.locale),timezone=COALESCE($4,user_preferences.timezone),updated_at=now()`,[request.currentUser!.id,theme??null,locale??null,timezone??null]);});
    await writeAudit({actorUserId:request.currentUser!.id,action:"account.updated",targetType:"user",targetId:request.currentUser!.id,requestId:request.id}); return ok(reply,{updated:true});
  });
  app.post("/api/v1/account/password",{preHandler:requireAuthAndCsrf},async(request,reply)=>{
    const body=jsonBody(request); const current=text(body.currentPassword,"Senha atual",1,128); const next=text(body.newPassword,"Nova senha",12,128); const errors=validatePassword(next); assert(errors.length===0,400,"WEAK_PASSWORD","A senha não atende aos requisitos.",errors);
    const result=await query<{password_hash:string|null}>("SELECT password_hash FROM users WHERE id=$1",[request.currentUser!.id]); assert(result.rows[0]?.password_hash&&await verifyPassword(result.rows[0].password_hash,current),400,"CURRENT_PASSWORD_INVALID","Senha atual inválida."); await query("UPDATE users SET password_hash=$1,password_changed_at=now() WHERE id=$2",[await hashPassword(next),request.currentUser!.id]); await query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2",[request.currentUser!.id,request.sessionId]); await writeAudit({actorUserId:request.currentUser!.id,action:"account.password.changed",targetType:"user",targetId:request.currentUser!.id,requestId:request.id}); return ok(reply,{changed:true});
  });
  app.get("/api/v1/account/sessions",{preHandler:requireAuth},async(request,reply)=>{ const result=await query("SELECT id,user_agent,created_at,last_seen_at,expires_at,CASE WHEN id=$2 THEN true ELSE false END current FROM sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY last_seen_at DESC",[request.currentUser!.id,request.sessionId]); return ok(reply,result.rows); });
  app.delete("/api/v1/account/sessions/:id",{preHandler:requireAuthAndCsrf},async(request,reply)=>{ const id=(request.params as {id:string}).id; await query("UPDATE sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2",[id,request.currentUser!.id]); return ok(reply,{revoked:true}); });
  app.post("/api/v1/account/sessions/revoke-others",{preHandler:requireAuthAndCsrf},async(request,reply)=>{ await query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL",[request.currentUser!.id,request.sessionId]); return ok(reply,{revoked:true}); });
  app.post("/api/v1/account/mfa/totp/start",{preHandler:requireAuthAndCsrf},async(request,reply)=>{
    const secret=new OTPAuth.Secret({size:20}); const encoded=secret.base32; const label=encodeURIComponent(request.currentUser!.email); const totp=new OTPAuth.TOTP({issuer:env.appName,label:request.currentUser!.email,algorithm:"SHA1",digits:6,period:30,secret});
    const result=await query<{id:string}>("INSERT INTO mfa_credentials(user_id,type,label,secret_encrypted) VALUES ($1,'totp','Aplicativo autenticador',$2) RETURNING id",[request.currentUser!.id,encryptSecret(encoded,env.encryptionKey)]);
    return ok(reply,{credentialId:result.rows[0]!.id,secret:encoded,uri:totp.toString(),label});
  });
  app.post("/api/v1/account/mfa/totp/confirm",{preHandler:requireAuthAndCsrf},async(request,reply)=>{
    const body=jsonBody(request); const credentialId=text(body.credentialId,"Credencial",10,100); const code=text(body.code,"Código",6,8); const result=await query<{secret_encrypted:string}>("SELECT secret_encrypted FROM mfa_credentials WHERE id=$1 AND user_id=$2 AND verified_at IS NULL",[credentialId,request.currentUser!.id]); assert(result.rows[0],404,"MFA_NOT_FOUND","Configuração MFA não encontrada."); const secret=decryptSecret(result.rows[0].secret_encrypted,env.encryptionKey); const totp=new OTPAuth.TOTP({issuer:env.appName,label:request.currentUser!.email,algorithm:"SHA1",digits:6,period:30,secret:OTPAuth.Secret.fromBase32(secret)}); assert(totp.validate({token:code,window:1})!==null,400,"MFA_INVALID","Código inválido.");
    const codes=Array.from({length:10},()=>randomToken(8)); await transaction(async(client)=>{await client.query("UPDATE mfa_credentials SET verified_at=now() WHERE id=$1",[credentialId]);for(const recovery of codes)await client.query("INSERT INTO recovery_codes(user_id,code_hash) VALUES ($1,$2)",[request.currentUser!.id,tokenHash(recovery)]);}); await writeAudit({actorUserId:request.currentUser!.id,action:"account.mfa.enabled",targetType:"user",targetId:request.currentUser!.id,requestId:request.id}); return ok(reply,{enabled:true,recoveryCodes:codes});
  });
  app.delete("/api/v1/account/mfa/:id",{preHandler:requireAuthAndCsrf},async(request,reply)=>{ const id=(request.params as {id:string}).id; await query("DELETE FROM mfa_credentials WHERE id=$1 AND user_id=$2",[id,request.currentUser!.id]); await writeAudit({actorUserId:request.currentUser!.id,action:"account.mfa.disabled",targetType:"mfa",targetId:id,requestId:request.id}); return ok(reply,{disabled:true}); });
}
