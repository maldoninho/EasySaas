import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import semver from "semver";
import ts from "typescript";
import unzipper from "unzipper";
import { env } from "@easysaas/config";
import { moduleSchema, type ModuleManifest } from "@easysaas/contracts";

interface AjvLike {
  readonly errors: readonly unknown[] | null;
  validate(schema: object, data: unknown): boolean;
  errorsText(
    errors?: readonly unknown[] | null,
    options?: { separator?: string },
  ): string;
}

type AjvConstructor = new (options?: {
  allErrors?: boolean;
  strict?: boolean;
}) => AjvLike;

function loadAjvConstructor(): AjvConstructor {
  const loaded: unknown = createRequire(import.meta.url)("ajv");

  if (typeof loaded === "function") {
    return loaded as AjvConstructor;
  }

  if (typeof loaded === "object" && loaded !== null && "default" in loaded) {
    const candidate = (loaded as { default: unknown }).default;
    if (typeof candidate === "function") {
      return candidate as AjvConstructor;
    }
  }

  throw new TypeError("Ajv não disponibilizou um construtor compatível.");
}

const Ajv = loadAjvConstructor();

export interface ValidationStage { name:string; status:"passed"|"failed"; message:string; }
export interface ModuleValidationResult { ok:boolean; manifest?:ModuleManifest; uploadHash:string; stagingPath:string; stages:ValidationStage[]; errors:string[]; fileCount:number; extractedBytes:number; }
const forbiddenPatterns:[RegExp,string][]=[
  [/\beval\s*\(/,"Uso de eval é proibido."],[/new\s+Function\s*\(/,"new Function é proibido."],
  [/from\s+["']node:child_process["']/,"child_process é proibido em módulos."],[/from\s+["']node:cluster["']/,"cluster é proibido em módulos."],
  [/process\.env/,"Módulos devem usar o contexto do Core, não process.env."],[/\.\.\/\.\.\/core\//,"Importação direta do Core é proibida."],
  [/from\s+["'][^"']*modules\//,"Importação direta de outro módulo é proibida."]
];
function inside(base:string,target:string):boolean { const rel=relative(base,target); return rel==="" || (!rel.startsWith("..") && !rel.includes(`..${sep}`) && !resolve(target).startsWith(`${sep}${sep}`)); }
async function walk(base:string):Promise<string[]> { const out:string[]=[]; for(const entry of await readdir(base,{withFileTypes:true})){ const p=resolve(base,entry.name); if(entry.isSymbolicLink()) throw new Error(`Link simbólico proibido: ${entry.name}`); if(entry.isDirectory()) out.push(...await walk(p)); else out.push(p); } return out; }

export async function validateModuleArchive(input:{archivePath:string; expectedStableId?:string; coreVersion?:string}):Promise<ModuleValidationResult>{
  const stagingPath=resolve(process.cwd(),"runtime/staging",randomUUID()); await mkdir(stagingPath,{recursive:true});
  const stages:ValidationStage[]=[]; const errors:string[]=[]; const upload=await readFile(input.archivePath); const uploadHash=createHash("sha256").update(upload).digest("hex");
  const push=(name:string,ok:boolean,message:string)=>{stages.push({name,status:ok?"passed":"failed",message});if(!ok)errors.push(message);};
  try {
    push("upload",upload.length<=env.maxUploadMb*1024*1024,`Pacote com ${(upload.length/1024/1024).toFixed(2)} MB.`); if(errors.length) throw new Error(errors.at(-1));
    const directory=await unzipper.Open.file(input.archivePath); let total=0;
    if(directory.files.length>env.moduleMaxFiles) throw new Error(`Pacote excede ${env.moduleMaxFiles} arquivos.`);
    for(const entry of directory.files){
      const normalized=entry.path.replaceAll("\\","/");
      if(normalized.startsWith("/")||normalized.includes("../")||normalized.includes("\u0000")) throw new Error(`Caminho inseguro: ${entry.path}`);
      const target=resolve(stagingPath,normalized); if(!inside(stagingPath,target)) throw new Error(`Arquivo fora da quarentena: ${entry.path}`);
      if(entry.type==="Directory"){await mkdir(target,{recursive:true});continue;}
      total+=entry.uncompressedSize; if(total>env.moduleMaxExtractedMb*1024*1024) throw new Error("Conteúdo extraído excede o limite.");
      await mkdir(dirname(target),{recursive:true}); const data=await entry.buffer(); await writeFile(target,data,{flag:"wx"});
    }
    push("extração",true,`${directory.files.length} entradas extraídas com segurança.`);
    const files=await walk(stagingPath); const manifestPath=files.find((f)=>relative(stagingPath,f).replaceAll("\\","/")==="module.json");
    if(!manifestPath) throw new Error("module.json deve estar na raiz do pacote.");
    const manifest=JSON.parse(await readFile(manifestPath,"utf8")) as ModuleManifest;
    const ajv=new Ajv({allErrors:true,strict:true}); const valid=ajv.validate(moduleSchema,manifest);
    if(!valid) throw new Error(`Manifesto inválido: ${ajv.errorsText(ajv.errors,{separator:"; "})}`);
    push("manifesto",true,"module.json validado pelo schema oficial.");
    if(input.expectedStableId&&manifest.stableId!==input.expectedStableId) throw new Error(`O pacote é ${manifest.stableId}, mas o módulo aberto é ${input.expectedStableId}.`);
    if(input.coreVersion&&!semver.satisfies(input.coreVersion,manifest.coreCompatibility)) throw new Error(`Módulo incompatível com o Core ${input.coreVersion}.`);
    for(const required of [manifest.entryFile,manifest.viewFile,manifest.serverFile].filter(Boolean) as string[]){ if(!files.some((f)=>relative(stagingPath,f).replaceAll("\\","/")===required)) throw new Error(`Arquivo declarado não encontrado: ${required}`); }
    push("estrutura",true,"Identidade e arquivos obrigatórios confirmados.");
    const sourceFiles=files.filter((f)=>[".ts",".tsx",".js",".jsx"].includes(extname(f)));
    const diagnostics:string[]=[];
    for(const file of sourceFiles){ const source=await readFile(file,"utf8"); for(const [pattern,message] of forbiddenPatterns) if(pattern.test(source)) diagnostics.push(`${relative(stagingPath,file)}: ${message}`);
      const result=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true},reportDiagnostics:true});
      for(const d of result.diagnostics??[]) diagnostics.push(`${relative(stagingPath,file)}: ${ts.flattenDiagnosticMessageText(d.messageText," ")}`);
    }
    if(diagnostics.length) throw new Error(diagnostics.join("\n"));
    push("código",true,`${sourceFiles.length} arquivos de código passaram na inspeção estática e transpilação.`);
    const declared=new Set(manifest.permissions); const used=new Set<string>();
    for(const file of sourceFiles){ const source=await readFile(file,"utf8"); for(const match of source.matchAll(/requirePermission\(["']([a-z0-9.-]+)["']\)/g)) if(match[1]) used.add(match[1]); }
    const undeclared=[...used].filter((p)=>!declared.has(p)); if(undeclared.length) throw new Error(`Permissões usadas e não declaradas: ${undeclared.join(", ")}`);
    push("permissões",true,"Permissões declaradas e detectadas são compatíveis.");
    return {ok:true,manifest,uploadHash,stagingPath,stages,errors,fileCount:files.length,extractedBytes:total};
  } catch(error){ push("resultado",false,error instanceof Error?error.message:"Falha desconhecida."); return {ok:false,uploadHash,stagingPath,stages,errors,fileCount:0,extractedBytes:0}; }
}
export async function discardStaging(path:string):Promise<void>{ await rm(path,{recursive:true,force:true}); }
