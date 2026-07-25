import assert from "node:assert/strict";
import test from "node:test";
import { constantTimeEqual, decryptSecret, encryptSecret, randomToken, tokenHash, validatePassword } from "./index.js";

test("senha fraca é rejeitada",()=>{assert.ok(validatePassword("senha123").length>0);assert.equal(validatePassword("UmaSenhaForte2026").length,0);});
test("tokens e hash são estáveis",()=>{const token=randomToken();assert.ok(token.length>20);assert.equal(tokenHash(token),tokenHash(token));assert.ok(constantTimeEqual(token,token));assert.equal(constantTimeEqual(token,`${token}x`),false);});
test("segredo AES-GCM pode ser recuperado",()=>{const key=Buffer.alloc(32,7).toString("base64");const encrypted=encryptSecret("segredo",key);assert.equal(decryptSecret(encrypted,key),"segredo");});
