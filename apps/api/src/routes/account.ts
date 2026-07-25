import type { FastifyInstance } from "fastify";
import { writeAudit } from "@easysaas/core";
import { query, transaction } from "@easysaas/database";
import { hashPassword, validatePassword, verifyPassword } from "@easysaas/security";
import { assert, jsonBody, ok, optionalText, text } from "../lib/http.js";
import { requireAuth, requireAuthAndCsrf } from "../services/session.js";

export async function accountRoutes(app:FastifyInstance):Promise<void>{
  app.get("/api/v1/account/overview",{preHandler:requireAuth},async(request,reply)=>{const notifications=await query("SELECT id,type,title,body,data,read_at,created_at FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 10",[request.currentUser!.id]);const activity=await query("SELECT action,target_type,target_id,created_at FROM audit_events WHERE actor_user_id=$1 ORDER BY created_at DESC LIMIT 10",[request.currentUser!.id]);return ok(reply,{notifications:notifications.rows,activity:activity.rows});});
  app.post("/api/v1/account/notifications/:id/read",{preHandler:requireAuthAndCsrf},async(request,reply)=>{const id=(request.params as {id:string}).id;await query("UPDATE notifications SET read_at=now() WHERE id=$1 AND (user_id=$2 OR user_id IS NULL)",[id,request.currentUser!.id]);return ok(reply,{read:true});});
  app.get("/api/v1/account",{preHandler:requireAuth},async(request,reply)=>{
    const profile=await query("SELECT u.id,u.email::text,u.name,u.avatar_path,u.created_at,p.theme,p.locale,p.timezone,p.sidebar_collapsed,p.notifications,p.accessibility FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE u.id=$1",[request.currentUser!.id]);
    return ok(reply,{profile:profile.rows[0]});
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
}
