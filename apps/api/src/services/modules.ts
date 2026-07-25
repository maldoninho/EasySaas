import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { slugify } from "@easysaas/core";

export async function createModuleScaffold(input:{stableId:string;name:string;description:string}):Promise<string>{
  const directory=resolve(process.cwd(),"modules",input.stableId); await mkdir(directory,{recursive:false});
  const manifest={schemaVersion:1,stableId:input.stableId,name:input.name,version:"0.1.0",description:input.description||"Módulo em implementação.",entryFile:"module.ts",viewFile:"view.tsx",permissions:[`${input.stableId}.access`],coreCompatibility:">=1.0.0 <2.0.0",capabilities:{frontend:true,backend:false,database:false,jobs:false}};
  await writeFile(resolve(directory,"module.json"),JSON.stringify(manifest,null,2)+"\n","utf8");
  await writeFile(resolve(directory,"package.json"),JSON.stringify({name:`@easysaas/module-${input.stableId}`,private:true,version:"0.1.0",type:"module",dependencies:{"@easysaas/module-sdk":"workspace:*","react":"^19.2.0"}},null,2)+"\n","utf8");
  await writeFile(resolve(directory,"module.ts"),`import { defineModule } from "@easysaas/module-sdk";\nexport default defineModule({ stableId: ${JSON.stringify(input.stableId)}, loadView: () => import("./view.js") });\n`,`utf8`);
  await writeFile(resolve(directory,"view.tsx"),`export default function ModuleView(){ return <main className="module-page"><h1>${input.name.replaceAll("<","&lt;")}</h1></main>; }\n`,`utf8`);
  await writeFile(resolve(directory,"module.test.ts"),`import test from "node:test"; import assert from "node:assert/strict"; test("manifesto possui identidade",()=>assert.equal(${JSON.stringify(input.stableId)},${JSON.stringify(slugify(input.stableId))}));\n`,`utf8`);
  await writeFile(resolve(directory,"AGENTS.md"),`# ${input.name}\n\n- O único ponto público é \`module.ts\`.\n- Não altere o Core.\n- Não importe internals de outros módulos.\n- Toda permissão usada deve constar em \`module.json\`.\n- Implemente estados de carregamento, vazio, erro e sucesso.\n`,`utf8`);
  return directory;
}
