import test from "node:test";
import assert from "node:assert/strict";
import { parseMajor, isSupportedNode } from "../../scripts/lib/version.mjs";

test("parseMajor entende versões com e sem v", () => {
  assert.equal(parseMajor("v24.18.0"), 24);
  assert.equal(parseMajor("22.16.0"), 22);
});

test("somente Node 24 é aceito pela fase", () => {
  assert.equal(isSupportedNode("24.18.0"), true);
  assert.equal(isSupportedNode("22.23.1"), false);
  assert.equal(isSupportedNode("26.5.0"), false);
});
