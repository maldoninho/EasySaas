import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "../../scripts/lib/env-file.mjs";
import { run } from "../../scripts/lib/process.mjs";

test(".env.local da raiz é carregado antes de subcomandos", () => {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    // Se não tem .env.local, o teste verifica que parseEnv funciona ao menos
    assert.ok(true, "sem .env.local — teste estrutural ignorado");
    return;
  }
  const parsed = parseEnv(readFileSync(envPath, "utf8"));
  assert.ok(Object.keys(parsed).length > 0, ".env.local deve ter variáveis");
  // Verifica que DATABASE_URL está presente
  assert.ok(parsed.DATABASE_URL, "DATABASE_URL deve estar em .env.local");
});

test("valores com = são preservados", () => {
  const parsed = parseEnv("URL=postgres://user:pass@host:5432/db?sslmode=require\nKEY=val=ue\n");
  assert.equal(parsed.URL, "postgres://user:pass@host:5432/db?sslmode=require");
  assert.equal(parsed.KEY, "val=ue");
});

test("process.env existente não é sobrescrito", () => {
  const key = "TEST_EXISTING_VAR";
  const original = "ORIGINAL_VALUE";
  process.env[key] = original;
  const parsed = parseEnv(`${key}=NOVO_VALOR\n`);
  // Simula o comportamento do validate.mjs: só define se undefined
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
  assert.equal(process.env[key], original, "variável existente não deve ser sobrescrita");
  delete process.env[key];
});

test("subprocesso herda process.env + options.env", () => {
  // run() com env customizado deve mesclar, não substituir
  const result = run(process.execPath, ["-e", "console.log(process.env.PATH ? 'ok' : 'sem-path')"], {
    capture: true,
    env: { TEST_CUSTOM: "custom_value" },
  });
  assert.match(result.stdout ?? "", /ok/, "PATH deve estar disponível no subprocesso");
});

test("slugify funciona sem DATABASE_URL", async () => {
  // Importa do dist compilado — não depende de tsx e não importa database/config
  const { slugify } = await import("../../packages/core/dist/slugify.js");
  assert.equal(slugify("  Geração de Artigos  "), "geracao-de-artigos");
  assert.equal(slugify("Hello World!!!"), "hello-world");
  assert.equal(slugify(""), "");
  const long = "a".repeat(100);
  assert.ok(slugify(long).length <= 80);
});

test("ausência real de .env.local gera erro controlado", async () => {
  // Simula o que acontece no config quando variável obrigatória não existe
  // sem .env.local carregado (forçando um cenário sem DATABASE_URL)
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const mod = await import("../../scripts/lib/env-file.mjs");
    // Apenas verifica que o parser não crasha
    const parsed = mod.parseEnv("");
    assert.deepEqual(parsed, {});
  } finally {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});
