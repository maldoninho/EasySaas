import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "@easysaas/config";
import { listUserPermissions } from "@easysaas/core";
import { query } from "@easysaas/database";
import { hashIp, randomToken, tokenHash } from "@easysaas/security";
import { HttpError } from "../lib/http.js";
import { getSecurityPolicy } from "./security-policy.js";

export interface CurrentUser { id:string; email:string; name:string; status:string; roles:string[]; permissions:string[]; mfaEnabled:boolean; }
export const SESSION_COOKIE=env.cookieSecure?"__Host-easysaas_session":"easysaas_session";
export const CSRF_COOKIE="easysaas_csrf";
const cookieBase={path:"/",sameSite:"strict" as const,secure:env.cookieSecure,domain:env.cookieDomain};

export async function createSession(input:{userId:string;request:FastifyRequest;reply:FastifyReply}):Promise<void>{
  const policy=await getSecurityPolicy();
  if(policy.singleSession) await query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[input.userId]);
  const raw=randomToken(); const csrf=randomToken(24); const expires=new Date(Date.now()+policy.sessionTtlHours*3600_000);
  await query(`INSERT INTO sessions(user_id,token_hash,csrf_token_hash,user_agent,ip_hash,expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,[
    input.userId,tokenHash(raw),tokenHash(csrf),input.request.headers["user-agent"]??null,hashIp(input.request.ip,env.sessionSecret),expires
  ]);
  input.reply.setCookie(SESSION_COOKIE,raw,{...cookieBase,httpOnly:true,expires});
  input.reply.setCookie(CSRF_COOKIE,csrf,{...cookieBase,httpOnly:false,expires});
}
export function clearSessionCookies(reply:FastifyReply):void { reply.clearCookie(SESSION_COOKIE,cookieBase); reply.clearCookie(CSRF_COOKIE,cookieBase); }
export async function loadCurrentUser(request:FastifyRequest):Promise<CurrentUser|undefined>{
  const raw=request.cookies[SESSION_COOKIE]; if(!raw) return undefined;
  const result=await query<{session_id:string;csrf_token_hash:string;id:string;email:string;name:string;status:string}>(`SELECT s.id session_id,s.csrf_token_hash,u.id,u.email::text,u.name,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()`,[tokenHash(raw)]);
  const row=result.rows[0]; if(!row||row.status!=="active") return undefined;
  request.sessionId=row.session_id; request.csrfTokenHash=row.csrf_token_hash;
  await query("UPDATE sessions SET last_seen_at=now() WHERE id=$1 AND last_seen_at<now()-interval '5 minutes'",[row.session_id]);
  const roles=(await query<{key:string}>("SELECT r.key FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 ORDER BY r.key",[row.id])).rows.map(r=>r.key);
  const mfaResult=await query<{enabled:boolean}>("SELECT EXISTS(SELECT 1 FROM mfa_credentials WHERE user_id=$1 AND verified_at IS NOT NULL) enabled",[row.id]);
  return {id:row.id,email:row.email,name:row.name,status:row.status,roles,permissions:await listUserPermissions(row.id),mfaEnabled:mfaResult.rows[0]?.enabled??false};
}
export async function requireAuth(request:FastifyRequest):Promise<void>{ const user=await loadCurrentUser(request); if(!user) throw new HttpError(401,"AUTH_REQUIRED","Autenticação obrigatória."); request.currentUser=user; }
export function requirePermission(permission:string){ return async(request:FastifyRequest):Promise<void>=>{ await requireAuth(request); if(!request.currentUser!.permissions.includes("*")&&!request.currentUser!.permissions.includes(permission)) throw new HttpError(403,"PERMISSION_DENIED","Você não possui permissão para esta ação."); const policy=await getSecurityPolicy(); if(policy.adminMfaRequired&&(permission==="admin.access"||permission.endsWith(".write")||permission==="security.manage"||permission==="modules.activate")&&!request.currentUser!.mfaEnabled) throw new HttpError(403,"ADMIN_MFA_REQUIRED","Configure a autenticação em duas etapas para realizar ações administrativas."); }; }
export async function requireCsrf(request:FastifyRequest):Promise<void>{
  const header=request.headers["x-csrf-token"]; const cookie=request.cookies[CSRF_COOKIE];
  if(typeof header!=="string"||!cookie||header!==cookie||tokenHash(header)!==request.csrfTokenHash) throw new HttpError(403,"CSRF_INVALID","Token de segurança inválido. Atualize a página e tente novamente.");
}
export async function requireAuthAndCsrf(request:FastifyRequest):Promise<void>{ await requireAuth(request); await requireCsrf(request); }
export function requirePermissionAndCsrf(permission:string){return async(request:FastifyRequest)=>{await requirePermission(permission)(request);await requireCsrf(request);};}
