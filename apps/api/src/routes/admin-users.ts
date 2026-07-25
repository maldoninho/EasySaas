import type { FastifyInstance } from "fastify";
import { env } from "@easysaas/config";
import { writeAudit } from "@easysaas/core";
import { query, transaction } from "@easysaas/database";
import { randomToken, tokenHash, verifyPassword } from "@easysaas/security";
import { assert, email, jsonBody, ok, optionalText, text } from "../lib/http.js";
import { enqueueJob } from "../services/jobs.js";
import { requirePermission, requirePermissionAndCsrf } from "../services/session.js";

async function ownerCount():Promise<number>{ const r=await query<{count:string}>("SELECT count(DISTINCT ur.user_id)::text count FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.is_owner=true",[]); return Number(r.rows[0]?.count??0); }
export async function adminUserRoutes(app:FastifyInstance):Promise<void>{
  app.get("/api/v1/admin/users",{preHandler:requirePermission("users.read")},async(request,reply)=>{
    const q=typeof (request.query as {q?:unknown}).q==="string"?(request.query as {q:string}).q.trim():"";
    const result=await query(`SELECT u.id,u.email::text,u.name,u.status,u.email_verified_at,u.last_login_at,u.created_at,
      COALESCE(json_agg(json_build_object('id',r.id,'key',r.key,'name',r.name)) FILTER (WHERE r.id IS NOT NULL),'[]') roles
      FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
      WHERE ($1='' OR u.email ILIKE '%'||$1||'%' OR u.name ILIKE '%'||$1||'%') GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200`,[q]);
    return ok(reply,result.rows);
  });
  app.post("/api/v1/admin/users/invite",{preHandler:requirePermissionAndCsrf("users.write")},async(request,reply)=>{
    const body=jsonBody(request); const inviteEmail=email(body.email); const name=optionalText(body.name,100); const roleIds=Array.isArray(body.roleIds)?body.roleIds.filter((v):v is string=>typeof v==="string"):[];
    assert(roleIds.length>0,400,"ROLE_REQUIRED","Selecione ao menos um papel.");
    const existing=await query("SELECT 1 FROM users WHERE email=$1 AND status<>'disabled'",[inviteEmail]); assert(existing.rowCount===0,409,"USER_EXISTS","Já existe um usuário com este e-mail.");
    const raw=randomToken(); const result=await query<{id:string}>("INSERT INTO invitations(email,name,token_hash,invited_by,role_ids,expires_at) VALUES ($1,$2,$3,$4,$5,now()+interval '7 days') RETURNING id",[inviteEmail,name??null,tokenHash(raw),request.currentUser!.id,roleIds]);
    await enqueueJob("email.send",{to:inviteEmail,subject:`Convite para ${env.appName}`,text:`Você foi convidado. Acesse: ${env.appUrl}/accept-invite?token=${encodeURIComponent(raw)}`});
    await writeAudit({actorUserId:request.currentUser!.id,action:"user.invited",targetType:"invitation",targetId:result.rows[0]!.id,metadata:{email:inviteEmail,roleIds},requestId:request.id}); return ok(reply,{invited:true},201);
  });
  app.patch("/api/v1/admin/users/:id/status",{preHandler:requirePermissionAndCsrf("users.write")},async(request,reply)=>{
    const id=(request.params as {id:string}).id; const body=jsonBody(request); const status=text(body.status,"Status",2,20); assert(["active","blocked","disabled"].includes(status),400,"INVALID_STATUS","Status inválido."); assert(id!==request.currentUser!.id||status==="active",400,"SELF_LOCK_DENIED","Você não pode bloquear sua própria conta.");
    const isOwner=await query("SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.is_owner=true",[id]); if(isOwner.rowCount&&status!=="active") assert((await ownerCount())>1,409,"LAST_OWNER_PROTECTED","O último proprietário não pode ser desativado.");
    await query("UPDATE users SET status=$1,updated_at=now() WHERE id=$2",[status,id]); if(status!=="active") await query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[id]);
    await writeAudit({actorUserId:request.currentUser!.id,action:"user.status.changed",targetType:"user",targetId:id,metadata:{status},requestId:request.id}); return ok(reply,{updated:true});
  });
  app.put("/api/v1/admin/users/:id/roles",{preHandler:requirePermissionAndCsrf("roles.write")},async(request,reply)=>{
    const id=(request.params as {id:string}).id; const body=jsonBody(request); const roleIds=Array.isArray(body.roleIds)?body.roleIds.filter((v):v is string=>typeof v==="string"):[]; assert(roleIds.length>0,400,"ROLE_REQUIRED","O usuário deve possuir ao menos um papel.");
    const validRoles=await query<{id:string;key:string;is_owner:boolean}>("SELECT id,key,is_owner FROM roles WHERE id=ANY($1::uuid[])",[roleIds]); assert(validRoles.rows.length===new Set(roleIds).size,400,"ROLE_INVALID","Um ou mais papéis são inválidos.");
    const currentRoles=await query<{key:string;is_owner:boolean}>("SELECT r.key,r.is_owner FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1",[id]);
    const currentlyOwner=currentRoles.rows.some((role)=>role.is_owner); const nextOwner=validRoles.rows.some((role)=>role.is_owner); if(currentlyOwner&&!nextOwner) assert((await ownerCount())>1,409,"LAST_OWNER_PROTECTED","O último proprietário não pode ser rebaixado.");
    const privilegedAdded=validRoles.rows.some((role)=>["owner","super-admin"].includes(role.key)&&!currentRoles.rows.some((current)=>current.key===role.key));
    if(privilegedAdded){const currentPassword=text(body.currentPassword,"Senha atual",1,128);const actor=await query<{password_hash:string|null}>("SELECT password_hash FROM users WHERE id=$1",[request.currentUser!.id]);assert(actor.rows[0]?.password_hash&&await verifyPassword(actor.rows[0].password_hash,currentPassword),403,"REAUTH_REQUIRED","Confirme sua senha atual para conceder acesso privilegiado.");}
    await transaction(async(client)=>{await client.query("DELETE FROM user_roles WHERE user_id=$1",[id]);for(const roleId of roleIds)await client.query("INSERT INTO user_roles(user_id,role_id,assigned_by) VALUES ($1,$2,$3)",[id,roleId,request.currentUser!.id]);});
    await writeAudit({actorUserId:request.currentUser!.id,action:"user.roles.changed",targetType:"user",targetId:id,metadata:{roleIds,privilegedAdded},requestId:request.id}); return ok(reply,{updated:true});
  });
  app.post("/api/v1/admin/users/:id/revoke-sessions",{preHandler:requirePermissionAndCsrf("users.write")},async(request,reply)=>{ const id=(request.params as {id:string}).id; await query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[id]); await writeAudit({actorUserId:request.currentUser!.id,action:"user.sessions.revoked",targetType:"user",targetId:id,requestId:request.id}); return ok(reply,{revoked:true}); });

  app.get("/api/v1/admin/roles",{preHandler:requirePermission("roles.read")},async(_request,reply)=>{ const result=await query(`SELECT r.id,r.key,r.name,r.description,r.is_system,r.is_owner,COALESCE(json_agg(p.key) FILTER(WHERE p.id IS NOT NULL),'[]') permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id GROUP BY r.id ORDER BY r.is_system DESC,r.name`); return ok(reply,result.rows); });
  app.get("/api/v1/admin/permissions",{preHandler:requirePermission("roles.read")},async(_request,reply)=>{ const result=await query("SELECT id,key,description FROM permissions ORDER BY key"); return ok(reply,result.rows); });
  app.post("/api/v1/admin/roles",{preHandler:requirePermissionAndCsrf("roles.write")},async(request,reply)=>{ const body=jsonBody(request); const key=text(body.key,"Chave",2,80).toLowerCase(); const name=text(body.name,"Nome",2,100); const description=optionalText(body.description,300); const permissions=Array.isArray(body.permissionIds)?body.permissionIds.filter((v):v is string=>typeof v==="string"):[]; const roleId=await transaction(async(client)=>{const r=await client.query<{id:string}>("INSERT INTO roles(key,name,description) VALUES ($1,$2,$3) RETURNING id",[key,name,description??null]);for(const permissionId of permissions)await client.query("INSERT INTO role_permissions(role_id,permission_id) VALUES ($1,$2)",[r.rows[0]!.id,permissionId]);return r.rows[0]!.id;}); await writeAudit({actorUserId:request.currentUser!.id,action:"role.created",targetType:"role",targetId:roleId,requestId:request.id}); return ok(reply,{id:roleId},201); });
  app.put("/api/v1/admin/roles/:id",{preHandler:requirePermissionAndCsrf("roles.write")},async(request,reply)=>{ const id=(request.params as {id:string}).id; const body=jsonBody(request); const role=await query<{is_system:boolean;is_owner:boolean}>("SELECT is_system,is_owner FROM roles WHERE id=$1",[id]); assert(role.rows[0],404,"ROLE_NOT_FOUND","Papel não encontrado."); const name=text(body.name,"Nome",2,100); const description=optionalText(body.description,300); const permissions=Array.isArray(body.permissionIds)?body.permissionIds.filter((v):v is string=>typeof v==="string"):[]; await transaction(async(client)=>{await client.query("UPDATE roles SET name=$1,description=$2,updated_at=now() WHERE id=$3",[name,description??null,id]);await client.query("DELETE FROM role_permissions WHERE role_id=$1",[id]);for(const permissionId of permissions)await client.query("INSERT INTO role_permissions(role_id,permission_id) VALUES ($1,$2)",[id,permissionId]);}); return ok(reply,{updated:true}); });
  app.delete("/api/v1/admin/roles/:id",{preHandler:requirePermissionAndCsrf("roles.write")},async(request,reply)=>{ const id=(request.params as {id:string}).id; const role=await query<{is_system:boolean}>("SELECT is_system FROM roles WHERE id=$1",[id]); assert(role.rows[0],404,"ROLE_NOT_FOUND","Papel não encontrado."); assert(!role.rows[0].is_system,400,"SYSTEM_ROLE_PROTECTED","Papéis do sistema não podem ser excluídos."); await query("DELETE FROM roles WHERE id=$1",[id]); return ok(reply,{deleted:true}); });
}
