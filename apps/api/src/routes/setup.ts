import type { FastifyInstance } from "fastify";
import { query } from "@easysaas/database";
import { ok } from "../lib/http.js";

export async function setupRoutes(app:FastifyInstance):Promise<void>{
  app.get("/api/v1/setup/status",async(_request,reply)=>{
    const result=await query<{complete:boolean}>("SELECT COALESCE((value->>'setupComplete')::boolean,false) complete FROM system_settings WHERE key='installation'");
    return ok(reply,{setupComplete:result.rows[0]?.complete??false});
  });
}
