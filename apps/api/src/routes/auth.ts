import type { FastifyInstance } from "fastify";
import * as OTPAuth from "otpauth";
import { env } from "@easysaas/config";
import { writeAudit } from "@easysaas/core";
import { query, transaction } from "@easysaas/database";
import { decryptSecret, hashIp, hashPassword, randomToken, tokenHash, validatePassword, verifyPassword } from "@easysaas/security";
import { assert, email, jsonBody, ok, optionalText, text } from "../lib/http.js";
import { enqueueJob } from "../services/jobs.js";
import { clearSessionCookies, createSession, loadCurrentUser, requireAuth, requireCsrf } from "../services/session.js";
import { getSecurityPolicy, verifyCaptcha } from "../services/security-policy.js";

async function verifyMfa(userId:string,code:string|undefined):Promise<void>{
  const result=await query<{secret_encrypted:string}>("SELECT secret_encrypted FROM mfa_credentials WHERE user_id=$1 AND type='totp' AND verified_at IS NOT NULL ORDER BY created_at DESC LIMIT 1",[userId]);
  const credential=result.rows[0]; if(!credential) return;
  assert(code,401,"MFA_REQUIRED","Código de autenticação ou recuperação obrigatório.");
  const normalized=code.trim();
  if (/^\d{6}$/.test(normalized)) {
    const secret=decryptSecret(credential.secret_encrypted,env.encryptionKey);
    const totp=new OTPAuth.TOTP({issuer:env.appName,label:"login",algorithm:"SHA1",digits:6,period:30,secret:OTPAuth.Secret.fromBase32(secret)});
    if(totp.validate({token:normalized,window:1})!==null) return;
  }
  const recovery=await query<{id:string}>("SELECT id FROM recovery_codes WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL LIMIT 1",[userId,tokenHash(normalized)]);
  assert(recovery.rows[0],401,"MFA_INVALID","Código de autenticação inválido.");
  await query("UPDATE recovery_codes SET used_at=now() WHERE id=$1 AND used_at IS NULL",[recovery.rows[0].id]);
}
export async function authRoutes(app:FastifyInstance):Promise<void>{
  app.post("/api/v1/auth/login",{config:{rateLimit:{max:10,timeWindow:"15 minutes"}}},async(request,reply)=>{
    const body=jsonBody(request); const userEmail=email(body.email); const password=text(body.password,"Senha",1,128); const mfaCode=optionalText(body.mfaCode,30); const captchaToken=optionalText(body.captchaToken,3000);
    const result=await query<{id:string;email:string;name:string;status:string;password_hash:string|null;failed_login_count:number;locked_until:Date|null}>("SELECT id,email::text,name,status,password_hash,failed_login_count,locked_until FROM users WHERE email=$1",[userEmail]);
    const user=result.rows[0]; const policy=await getSecurityPolicy(); const captchaRequired=policy.captchaMode==="always"||(policy.captchaMode==="adaptive"&&(user?.failed_login_count??0)>=3); if(captchaRequired) await verifyCaptcha(captchaToken,request.ip); const generic=():never=>{throw Object.assign(new Error("E-mail ou senha inválidos."),{statusCode:401,code:"INVALID_CREDENTIALS"});};
    if(!user) return generic();
    if(!user.password_hash||user.status!=="active"||(user.locked_until&&user.locked_until>new Date())) return generic();
    if(!(await verifyPassword(user.password_hash,password))){
      await query("UPDATE users SET failed_login_count=failed_login_count+1,locked_until=CASE WHEN failed_login_count+1>=10 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1",[user.id]);
      await query("INSERT INTO security_events(user_id,type,severity,metadata) VALUES ($1,'login.failed','warning',$2::jsonb)",[user.id,JSON.stringify({ipHash:hashIp(request.ip,env.sessionSecret)})]); generic();
    }
    await verifyMfa(user.id,mfaCode); await query("UPDATE users SET failed_login_count=0,locked_until=NULL,last_login_at=now() WHERE id=$1",[user.id]);
    await createSession({userId:user.id,request,reply}); await writeAudit({actorUserId:user.id,action:"auth.login",targetType:"session",requestId:request.id,ipHash:hashIp(request.ip,env.sessionSecret)});
    return ok(reply,{user:{id:user.id,email:user.email,name:user.name},redirectTo:"/app"});
  });

  app.post("/api/v1/auth/logout",{preHandler:[requireAuth,requireCsrf]},async(request,reply)=>{
    await query("UPDATE sessions SET revoked_at=now() WHERE id=$1",[request.sessionId]); clearSessionCookies(reply);
    await writeAudit({actorUserId:request.currentUser!.id,action:"auth.logout",targetType:"session",targetId:request.sessionId,requestId:request.id}); return ok(reply,{loggedOut:true});
  });

  app.get("/api/v1/auth/me",async(request,reply)=>{ const user=await loadCurrentUser(request); return ok(reply,{authenticated:Boolean(user),user:user??null}); });

  app.post("/api/v1/auth/register",{config:{rateLimit:{max:5,timeWindow:"30 minutes"}}},async(request,reply)=>{
    const policy=await getSecurityPolicy(); assert(policy.publicSignup,404,"SIGNUP_DISABLED","O cadastro público não está disponível.");
    const body=jsonBody(request); const userEmail=email(body.email); const name=text(body.name,"Nome",2,100); const password=text(body.password,"Senha",12,128); const captchaToken=optionalText(body.captchaToken,3000); const errors=validatePassword(password); assert(errors.length===0,400,"WEAK_PASSWORD","A senha não atende aos requisitos.",errors);
    if(policy.captchaMode!=="off") await verifyCaptcha(captchaToken,request.ip);
    const existing=await query<{id:string;status:string}>("SELECT id,status FROM users WHERE email=$1",[userEmail]);
    if(!existing.rows[0]){
      const raw=randomToken(); const hash=await hashPassword(password);
      const userId=await transaction(async(client)=>{const created=await client.query<{id:string}>("INSERT INTO users(email,name,password_hash,status,password_changed_at) VALUES ($1,$2,$3,'pending',now()) RETURNING id",[userEmail,name,hash]);await client.query("INSERT INTO user_preferences(user_id) VALUES ($1)",[created.rows[0]!.id]);await client.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE key='user'",[created.rows[0]!.id]);await client.query("INSERT INTO verification_tokens(user_id,token_hash,purpose,expires_at) VALUES ($1,$2,'verify_email',now()+interval '24 hours')",[created.rows[0]!.id,tokenHash(raw)]);return created.rows[0]!.id;});
      await enqueueJob("email.send",{to:userEmail,subject:"Confirme seu e-mail",text:`Confirme sua conta: ${env.appUrl}/verify-email?token=${encodeURIComponent(raw)}`});
      await writeAudit({actorUserId:userId,action:"auth.registration.created",targetType:"user",targetId:userId,requestId:request.id});
    }else if(existing.rows[0].status==="pending"){
      const raw=randomToken();await query("UPDATE verification_tokens SET consumed_at=now() WHERE user_id=$1 AND purpose='verify_email' AND consumed_at IS NULL",[existing.rows[0].id]);await query("INSERT INTO verification_tokens(user_id,token_hash,purpose,expires_at) VALUES ($1,$2,'verify_email',now()+interval '24 hours')",[existing.rows[0].id,tokenHash(raw)]);await enqueueJob("email.send",{to:userEmail,subject:"Confirme seu e-mail",text:`Confirme sua conta: ${env.appUrl}/verify-email?token=${encodeURIComponent(raw)}`});
    }
    return ok(reply,{message:"Se o cadastro puder ser criado, enviaremos a confirmação por e-mail."},201);
  });

  app.post("/api/v1/auth/verify-email",async(request,reply)=>{
    const body=jsonBody(request); const raw=text(body.token,"Token",10,500); const captchaToken=optionalText(body.captchaToken,3000); const policy=await getSecurityPolicy(); if(policy.captchaMode!=="off") await verifyCaptcha(captchaToken,request.ip);
    const userId=await transaction(async(client)=>{const found=await client.query<{id:string;user_id:string}>("SELECT id,user_id FROM verification_tokens WHERE token_hash=$1 AND purpose='verify_email' AND consumed_at IS NULL AND expires_at>now() FOR UPDATE",[tokenHash(raw)]);assert(found.rows[0],400,"TOKEN_INVALID","Token inválido ou expirado.");await client.query("UPDATE users SET status='active',email_verified_at=now(),updated_at=now() WHERE id=$1 AND status='pending'",[found.rows[0].user_id]);await client.query("UPDATE verification_tokens SET consumed_at=now() WHERE id=$1",[found.rows[0].id]);return found.rows[0].user_id;});
    await createSession({userId,request,reply});await writeAudit({actorUserId:userId,action:"auth.email.verified",targetType:"user",targetId:userId,requestId:request.id});return ok(reply,{verified:true,redirectTo:"/app"});
  });

  app.post("/api/v1/auth/forgot-password",{config:{rateLimit:{max:5,timeWindow:"15 minutes"}}},async(request,reply)=>{
    const body=jsonBody(request); const userEmail=email(body.email); const captchaToken=optionalText(body.captchaToken,3000); const policy=await getSecurityPolicy(); if(policy.captchaMode!=="off") await verifyCaptcha(captchaToken,request.ip);
    const result=await query<{id:string;name:string}>("SELECT id,name FROM users WHERE email=$1 AND status='active'",[userEmail]); const user=result.rows[0];
    if(user){ const raw=randomToken(); await query("INSERT INTO verification_tokens(user_id,token_hash,purpose,expires_at) VALUES ($1,$2,'reset_password',now()+interval '30 minutes')",[user.id,tokenHash(raw)]); await enqueueJob("email.send",{to:userEmail,subject:"Redefinição de senha",text:`Use este link para redefinir sua senha: ${env.appUrl}/reset-password?token=${encodeURIComponent(raw)}`}); }
    return ok(reply,{message:"Se a conta existir, as instruções serão enviadas."});
  });

  app.post("/api/v1/auth/reset-password",async(request,reply)=>{
    const body=jsonBody(request); const raw=text(body.token,"Token",10,500); const password=text(body.password,"Senha",12,128); const captchaToken=optionalText(body.captchaToken,3000); const policy=await getSecurityPolicy(); if(policy.captchaMode!=="off") await verifyCaptcha(captchaToken,request.ip);
    const errors=validatePassword(password); assert(errors.length===0,400,"WEAK_PASSWORD","A senha não atende aos requisitos.",errors);
    const userId=await transaction(async(client)=>{ const found=await client.query<{id:string;user_id:string}>("SELECT id,user_id FROM verification_tokens WHERE token_hash=$1 AND purpose='reset_password' AND consumed_at IS NULL AND expires_at>now() FOR UPDATE",[tokenHash(raw)]); assert(found.rows[0],400,"TOKEN_INVALID","Token inválido ou expirado."); const hash=await hashPassword(password); await client.query("UPDATE users SET password_hash=$1,password_changed_at=now(),failed_login_count=0,locked_until=NULL WHERE id=$2",[hash,found.rows[0].user_id]); await client.query("UPDATE verification_tokens SET consumed_at=now() WHERE id=$1",[found.rows[0].id]); await client.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1",[found.rows[0].user_id]); return found.rows[0].user_id; });
    await writeAudit({actorUserId:userId,action:"auth.password.reset",targetType:"user",targetId:userId,requestId:request.id}); return ok(reply,{reset:true,redirectTo:"/login"});
  });

  app.post("/api/v1/auth/accept-invite",async(request,reply)=>{
    const body=jsonBody(request); const raw=text(body.token,"Token",10,500); const name=text(body.name,"Nome",2,100); const password=text(body.password,"Senha",12,128); const captchaToken=optionalText(body.captchaToken,3000); const policy=await getSecurityPolicy(); if(policy.captchaMode!=="off") await verifyCaptcha(captchaToken,request.ip); const errors=validatePassword(password); assert(errors.length===0,400,"WEAK_PASSWORD","A senha não atende aos requisitos.",errors);
    const userId=await transaction(async(client)=>{ const invite=await client.query<{id:string;email:string;role_ids:string[]}>("SELECT id,email::text,role_ids FROM invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE",[tokenHash(raw)]); assert(invite.rows[0],400,"INVITE_INVALID","Convite inválido ou expirado."); const hash=await hashPassword(password); const existing=await client.query<{id:string}>("SELECT id FROM users WHERE email=$1",[invite.rows[0].email]); let id=existing.rows[0]?.id; if(id){await client.query("UPDATE users SET name=$1,password_hash=$2,status='active',email_verified_at=COALESCE(email_verified_at,now()),updated_at=now() WHERE id=$3",[name,hash,id]);}else{const created=await client.query<{id:string}>("INSERT INTO users(email,name,password_hash,status,email_verified_at,password_changed_at) VALUES ($1,$2,$3,'active',now(),now()) RETURNING id",[invite.rows[0].email,name,hash]);id=created.rows[0]!.id;await client.query("INSERT INTO user_preferences(user_id) VALUES ($1)",[id]);} for(const roleId of invite.rows[0].role_ids) await client.query("INSERT INTO user_roles(user_id,role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",[id,roleId]); await client.query("UPDATE invitations SET accepted_at=now() WHERE id=$1",[invite.rows[0].id]); return id!; });
    await createSession({userId,request,reply}); await writeAudit({actorUserId:userId,action:"auth.invite.accepted",targetType:"user",targetId:userId,requestId:request.id}); return ok(reply,{accepted:true,redirectTo:"/app"});
  });
}
