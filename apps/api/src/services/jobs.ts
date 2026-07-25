import { query } from "@easysaas/database";
export async function enqueueJob(type:string,payload:unknown,maxAttempts=3):Promise<string>{ const result=await query<{id:string}>("INSERT INTO jobs(type,payload,max_attempts) VALUES ($1,$2::jsonb,$3) RETURNING id",[type,JSON.stringify(payload),maxAttempts]); return result.rows[0]!.id; }
