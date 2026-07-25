import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parseEnv } from "./lib/env-file.mjs";
import { run } from "./lib/process.mjs";

const env=parseEnv(await readFile(".env.local","utf8"));
if(!env.DATABASE_URL)throw new Error("DATABASE_URL ausente em .env.local");
const timestamp=new Date().toISOString().replaceAll(":","-");
const dir=resolve("runtime/backups",timestamp);
await mkdir(dir,{recursive:true});
run("pg_dump",["--format=custom","--file",resolve(dir,"database.dump"),env.DATABASE_URL],{cwd:process.cwd()});
await cp(resolve("runtime/module-store"),resolve(dir,"module-store"),{recursive:true}).catch(()=>{});
await cp(resolve(env.STORAGE_LOCAL_PATH||"runtime/storage"),resolve(dir,"storage"),{recursive:true}).catch(()=>{});
await writeFile(resolve(dir,"manifest.json"),JSON.stringify({createdAt:new Date().toISOString(),applicationVersion:"1.0.0",includes:["database.dump","module-store","storage"]},null,2)+"\n","utf8");
console.log(`Backup criado em ${dir}`);
