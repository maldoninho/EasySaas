import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { run } from "./lib/process.mjs";
import { projectRoot, rootPath } from "./lib/root.mjs";
import { parseEnv } from "./lib/env-file.mjs";
const args=new Set(process.argv.slice(2));const production=args.has("--production");const noStart=args.has("--no-start");const packageJson=JSON.parse(await readFile(rootPath("package.json"),"utf8"));
console.log("\nEasySaaS — instalação e validação\n");run(process.execPath,["scripts/doctor.mjs","--preinstall"],{cwd:projectRoot});run(process.execPath,["scripts/repair.mjs"],{cwd:projectRoot});
run("corepack",["enable"],{cwd:projectRoot});let prepared=false;for(const command of [["install","--global",packageJson.packageManager],["prepare",packageJson.packageManager,"--activate"]]){try{run("corepack",command,{cwd:projectRoot});prepared=true;break;}catch{}}if(!prepared)throw new Error(`Não foi possível ativar ${packageJson.packageManager}.`);
if(existsSync(rootPath("pnpm-lock.yaml")))run("pnpm",["install","--frozen-lockfile"],{cwd:projectRoot});else{if(production)throw new Error("Produção exige pnpm-lock.yaml gerado e revisado.");run("pnpm",["install","--no-frozen-lockfile"],{cwd:projectRoot});}
run("pnpm",["modules:registry"],{cwd:projectRoot});
run("pnpm",["packages:build"],{cwd:projectRoot});
run("pnpm",["packages:check"],{cwd:projectRoot});
run("pnpm",["validate"],{cwd:projectRoot});
if(!production)run("pnpm",["--filter","@easysaas/database","prepare:local"],{cwd:projectRoot});
run("pnpm",["db:migrate"],{cwd:projectRoot});
run("pnpm",["db:seed"],{cwd:projectRoot});
if(production)run("pnpm",["build"],{cwd:projectRoot});
if(noStart){console.log("Bootstrap concluído.");process.exit(0);}
run(process.execPath,["scripts/doctor.mjs","--prestart"],{cwd:projectRoot});
const env=parseEnv(await readFile(rootPath(".env.local"),"utf8"));
console.log(`Web: ${env.APP_URL}\nAPI interna: ${env.API_INTERNAL_URL}`);
run("pnpm",[production ? "start:direct" : "dev:direct"],{cwd:projectRoot});
