import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { requirePermission } from "../services/session.js";

export async function registerGeneratedModuleServers(app:FastifyInstance):Promise<void>{
  const statePath=resolve(process.cwd(),"runtime/active-modules.json"); if(!existsSync(statePath)) return;
  const state=JSON.parse(await readFile(statePath,"utf8")) as {modules:Array<{stableId:string}>};
  for(const item of state.modules){const runtime=resolve(process.cwd(),"runtime/module-runtime",item.stableId,"server.js");if(!existsSync(runtime))continue;const imported=await import(`${pathToFileURL(runtime).href}?v=${Date.now()}`) as {default?:unknown;register?:unknown};const registrar=typeof imported.default==="function"?imported.default:typeof imported.register==="function"?imported.register:undefined;if(!registrar)throw new Error(`Servidor do módulo ${item.stableId} não exporta uma função.`);await (registrar as (app:FastifyInstance,ctx:unknown)=>Promise<void>|void)(app,{stableId:item.stableId,requirePermission});}
}
