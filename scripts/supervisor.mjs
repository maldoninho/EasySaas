import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { parseEnv } from "./lib/env-file.mjs";
const mode=process.argv[2];if(!["dev","start"].includes(mode))throw new Error("Uso: node scripts/supervisor.mjs dev|start");
const fileEnv=existsSync(resolve(process.cwd(),".env.local"))?parseEnv(await readFile(resolve(process.cwd(),".env.local"),"utf8")):{};const env={...process.env,...fileEnv,EASYSAAS_ROOT:process.cwd()};let children=[];let stopping=false;let restarting=false;
function spawnOne(filter){const command=process.platform==="win32"?"pnpm.cmd":"pnpm";const child=spawn(command,["--filter",filter,mode],{cwd:process.cwd(),env,stdio:"inherit",shell:false});child.on("exit",(code)=>{if(!stopping&&!restarting&&code!==0){console.error(`${filter} encerrou com código ${code}.`);shutdown(1);}});return child;}
function start(){children=[spawnOne("@easysaas/api"),spawnOne("@easysaas/web"),spawnOne("@easysaas/worker")];}
async function stopChildren(){await Promise.all(children.map((child)=>new Promise((done)=>{if(child.exitCode!==null)return done();child.once("exit",done);child.kill("SIGTERM");setTimeout(()=>{if(child.exitCode===null)child.kill("SIGKILL");},5000).unref();})));children=[];}
async function restart(reason){if(stopping||restarting)return;restarting=true;console.log(`\n[supervisor] reiniciando: ${reason}\n`);await stopChildren();start();restarting=false;}
async function watch(){const signal=resolve(process.cwd(),"runtime/reload.signal");while(!stopping){if(existsSync(signal)){let reason="atualização estrutural";try{reason=JSON.parse(await readFile(signal,"utf8")).reason??reason;}catch{}await rm(signal,{force:true});await restart(reason);}await new Promise((r)=>setTimeout(r,1000));}}
async function shutdown(code=0){if(stopping)return;stopping=true;await stopChildren();process.exit(code);}process.on("SIGINT",()=>void shutdown());process.on("SIGTERM",()=>void shutdown());start();void watch();
