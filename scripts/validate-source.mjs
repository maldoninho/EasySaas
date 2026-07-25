import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
const root=process.cwd(); const ignored=new Set(["node_modules",".next","dist","runtime"]); const files=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const p=resolve(dir,entry.name);if(entry.isDirectory())await walk(p);else files.push(p);}}
await walk(root);
const violations=[];
for(const file of files){const ext=extname(file);if(![".ts",".tsx",".mjs"].includes(ext))continue;const source=await readFile(file,"utf8");
  if(/\bany\b/.test(source)&&!file.endsWith("validate-source.mjs"))violations.push(`${relative(root,file)}: uso de any`);
  if(/\beval\s*\(|new\s+Function\s*\(/.test(source)&&!file.endsWith("validate-source.mjs"))violations.push(`${relative(root,file)}: execução dinâmica proibida`);
  if(/from\s+["']\.{1,2}\/[^"']+\.(ts|tsx)["']/.test(source))violations.push(`${relative(root,file)}: import relativo com extensão TypeScript; use .js no backend NodeNext`);
}
if(violations.length)throw new Error(violations.join("\n"));
console.log(`Código-fonte inspecionado: ${files.length} arquivos, sem violações canônicas.`);
