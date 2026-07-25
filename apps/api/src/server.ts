import { env } from "@easysaas/config";
import { closeDatabase } from "@easysaas/database";
import { buildApp } from "./app.js";
const app=await buildApp();
const shutdown=async(signal:string)=>{app.log.info({signal},"Encerrando API");await app.close();await closeDatabase();process.exit(0);};
process.on("SIGINT",()=>void shutdown("SIGINT"));process.on("SIGTERM",()=>void shutdown("SIGTERM"));
await app.listen({host:env.apiHost,port:env.apiPort});
