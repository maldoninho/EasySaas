import test from "node:test";
import assert from "node:assert/strict";
import { parseEnv, serializeEnv } from "../../scripts/lib/env-file.mjs";

test("parseEnv ignora comentários e preserva valores com igual", () => {
  const parsed = parseEnv("# comentário\nA=1\nURL=postgres://a:b@host/db?x=1\nEMPTY=\n");
  assert.deepEqual(parsed, { A: "1", URL: "postgres://a:b@host/db?x=1", EMPTY: "" });
});

test("serializeEnv gera arquivo terminado em nova linha", () => {
  assert.equal(serializeEnv({ A: "1" }), "A=1\n");
});
