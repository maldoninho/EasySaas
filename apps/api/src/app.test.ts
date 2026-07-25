import test from "node:test";
import assert from "node:assert/strict";
process.env.DATABASE_URL??="postgresql://invalid:invalid@127.0.0.1:1/invalid";
process.env.SESSION_SECRET??="12345678901234567890123456789012";
process.env.ENCRYPTION_KEY??=Buffer.alloc(32,1).toString("base64");
test("API module exports buildApp",async()=>{const module=await import("./app.js");assert.equal(typeof module.buildApp,"function");});
