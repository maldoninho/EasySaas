import assert from "node:assert/strict";
import test from "node:test";
import { slugify } from "./slugify.js";
test("slugify normaliza acentos e espaços",()=>{assert.equal(slugify("  Geração de Artigos  "),"geracao-de-artigos");});
test("slugify remove caracteres especiais",()=>{assert.equal(slugify("Hello World!!!"),"hello-world");});
test("slugify string vazia retorna vazio",()=>{assert.equal(slugify(""),"");});
test("slugify trunca em 80 caracteres",()=>{const long="a".repeat(100);assert.ok(slugify(long).length<=80);});
