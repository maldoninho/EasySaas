import { query } from "@easysaas/database";

export { slugify } from "./slugify.js";

export async function writeAudit(input:{actorUserId?:string; action:string; targetType?:string; targetId?:string; metadata?:unknown; requestId?:string; ipHash?:string}):Promise<void>{
  await query(`INSERT INTO audit_events(actor_user_id, action, target_type, target_id, metadata, request_id, ip_hash)
    VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`,[
      input.actorUserId ?? null,input.action,input.targetType ?? null,input.targetId ?? null,JSON.stringify(input.metadata ?? {}),input.requestId ?? null,input.ipHash ?? null
    ]);
}
export async function userHasPermission(userId:string, permission:string):Promise<boolean>{
  const result=await query<{allowed:boolean}>(`SELECT EXISTS(
    SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id
    WHERE ur.user_id=$1 AND (p.key=$2 OR p.key='*')
  ) AS allowed`,[userId,permission]);
  return result.rows[0]?.allowed ?? false;
}
export async function listUserPermissions(userId:string):Promise<string[]>{
  const result=await query<{key:string}>(`SELECT DISTINCT p.key FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=$1 ORDER BY p.key`,[userId]);
  return result.rows.map((row)=>row.key);
}
