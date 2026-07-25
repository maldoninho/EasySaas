import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const root=process.cwd();const statePath=resolve(root,"runtime/active-modules.json");
let state={modules:[]};if(existsSync(statePath))state=JSON.parse(await readFile(statePath,"utf8"));else{await mkdir(resolve(root,"runtime"),{recursive:true});await writeFile(statePath,JSON.stringify(state,null,2)+"\n");}
const entries=[];
for(const item of state.modules){if(!/^[a-z][a-z0-9-]*$/.test(item.stableId))throw new Error(`stableId inválido: ${item.stableId}`);const manifestPath=resolve(root,"modules",item.stableId,"module.json");if(!existsSync(manifestPath))throw new Error(`Módulo ativo sem manifesto: ${item.stableId}`);const manifest=JSON.parse(await readFile(manifestPath,"utf8"));const view=manifest.viewFile??"view.tsx";if(!/^[a-zA-Z0-9_./-]+\.tsx$/.test(view)||view.includes(".."))throw new Error(`viewFile inválido em ${item.stableId}`);entries.push({stableId:item.stableId,view});}
const lines=["/* Arquivo gerado. Não editar manualmente. */","import type { ComponentType } from \"react\";","export type ModuleViewLoader = () => Promise<{ default: ComponentType }>;","export const moduleViewLoaders: Record<string, ModuleViewLoader> = {"];
for(const entry of entries)lines.push(`  ${JSON.stringify(entry.stableId)}: () => import(${JSON.stringify(`../../../../modules/${entry.stableId}/${entry.view}`)}),`);
lines.push("};","");const target=resolve(root,"apps/web/src/generated/module-registry.ts");await mkdir(dirname(target),{recursive:true});await writeFile(target,lines.join("\n"),"utf8");console.log(`Registry gerado com ${entries.length} módulo(s) ativo(s).`);
