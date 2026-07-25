import type { FastifyInstance } from "fastify";
import { query } from "@easysaas/database";
import { ok } from "../lib/http.js";
import { requirePermission } from "../services/session.js";
export async function adminAuditRoutes(app:FastifyInstance):Promise<void>{app.get("/api/v1/admin/audit",{preHandler:requirePermission("audit.read")},async(request,reply)=>{const q=request.query as {action?:string;userId?:string};const result=await query(`SELECT a.id,a.action,a.target_type,a.target_id,a.metadata,a.request_id,a.created_at,u.name actor_name,u.email::text actor_email FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id WHERE ($1='' OR a.action ILIKE '%'||$1||'%') AND ($2='' OR a.actor_user_id::text=$2) ORDER BY a.created_at DESC LIMIT 500`,[q.action??"",q.userId??""]);return ok(reply,result.rows);});}
