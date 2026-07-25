import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 3, parallelism: 1 });
}
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try { return await argon2.verify(hash, password); } catch { return false; }
}
export function validatePassword(password: string): string[] {
  const errors:string[]=[];
  if (password.length < 12) errors.push("A senha deve ter pelo menos 12 caracteres.");
  if (password.length > 128) errors.push("A senha deve ter no máximo 128 caracteres.");
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) errors.push("Use letras maiúsculas, minúsculas e números.");
  const common=["password","senha123","123456789","qwerty","admin123"];
  if (common.some((value)=>password.toLowerCase().includes(value))) errors.push("A senha contém um padrão comprometido.");
  return errors;
}
export function randomToken(bytes = 32): string { return randomBytes(bytes).toString("base64url"); }
export function tokenHash(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function constantTimeEqual(a:string,b:string):boolean {
  const aa=Buffer.from(a); const bb=Buffer.from(b); return aa.length===bb.length && timingSafeEqual(aa,bb);
}
export function hashIp(ip:string, secret:string):string { return createHash("sha256").update(`${secret}:${ip}`).digest("hex"); }
export function encryptSecret(value:string, base64Key:string):string {
  const key=Buffer.from(base64Key,"base64"); if(key.length!==32) throw new Error("ENCRYPTION_KEY deve conter 32 bytes em base64.");
  const iv=randomBytes(12); const cipher=createCipheriv("aes-256-gcm",key,iv); const data=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),data.toString("base64url")].join(".");
}
export function decryptSecret(value:string, base64Key:string):string {
  const [ivText,tagText,dataText]=value.split("."); if(!ivText||!tagText||!dataText) throw new Error("Segredo criptografado inválido.");
  const key=Buffer.from(base64Key,"base64"); const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(ivText,"base64url"));
  decipher.setAuthTag(Buffer.from(tagText,"base64url")); return Buffer.concat([decipher.update(Buffer.from(dataText,"base64url")),decipher.final()]).toString("utf8");
}
