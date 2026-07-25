import assert from "node:assert/strict";
import test from "node:test";
import { moduleSchema } from "./index.js";
test("schema exige ponto de entrada e view",()=>{assert.equal(moduleSchema.properties.entryFile.const,"module.ts");assert.ok(moduleSchema.required.includes("viewFile"));});
