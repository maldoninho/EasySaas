import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const path=process.argv[2];if(!path)throw new Error("Uso: pnpm restore:check -- <pasta-do-backup>");
for(const file of ["database.dump","manifest.json"])if(!existsSync(resolve(path,file)))throw new Error(`Backup incompleto: ${file}`);
const manifest=JSON.parse(await readFile(resolve(path,"manifest.json"),"utf8"));
if(!manifest.createdAt||!manifest.applicationVersion)throw new Error("Manifesto de backup inválido.");
console.log(`Estrutura do backup aprovada (${manifest.createdAt}, versão ${manifest.applicationVersion}).`);
console.log("A restauração real deve ser executada em PostgreSQL isolado antes de considerar o backup confiável.");
