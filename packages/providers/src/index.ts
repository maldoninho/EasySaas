import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import nodemailer from "nodemailer";
import { env } from "@easysaas/config";

export interface EmailMessage { to:string; subject:string; text:string; html?:string; }
export interface EmailProvider { send(message:EmailMessage):Promise<{id:string}>; verify():Promise<void>; }

class FileEmailProvider implements EmailProvider {
  async verify():Promise<void>{ await mkdir(resolve(process.cwd(),"runtime/mail-outbox"),{recursive:true}); }
  async send(message:EmailMessage):Promise<{id:string}>{
    await this.verify(); const id=randomUUID();
    await writeFile(resolve(process.cwd(),"runtime/mail-outbox",`${Date.now()}-${id}.json`),JSON.stringify({...message,id,createdAt:new Date().toISOString()},null,2),"utf8");
    return {id};
  }
}
class SmtpEmailProvider implements EmailProvider {
  private readonly transport=nodemailer.createTransport({host:env.smtpHost,port:env.smtpPort,secure:env.smtpSecure,auth:env.smtpUser?{user:env.smtpUser,pass:env.smtpPassword}:undefined});
  async verify():Promise<void>{ await this.transport.verify(); }
  async send(message:EmailMessage):Promise<{id:string}>{ const result=await this.transport.sendMail({from:env.smtpFrom,...message}); return {id:result.messageId}; }
}
export function createEmailProvider():EmailProvider { return env.smtpMode==="smtp"?new SmtpEmailProvider():new FileEmailProvider(); }

export interface StoredFile { key:string; size:number; sha256:string; }
export interface StorageProvider { put(input:{data:Buffer;originalName:string;purpose:string}):Promise<StoredFile>; read(key:string):Promise<Buffer>; delete(key:string):Promise<void>; }
class LocalStorageProvider implements StorageProvider {
  private readonly base=resolve(process.cwd(),env.storageLocalPath);
  async put(input:{data:Buffer;originalName:string;purpose:string}):Promise<StoredFile>{
    const safeBase=basename(input.originalName).replace(/[^a-zA-Z0-9._-]/g,"_"); const key=`${input.purpose}/${new Date().toISOString().slice(0,10)}/${randomUUID()}-${safeBase}`;
    const target=resolve(this.base,key); if(relative(this.base,target).startsWith("..")) throw new Error("Caminho de armazenamento inválido.");
    await mkdir(dirname(target),{recursive:true}); await writeFile(target,input.data,{flag:"wx"});
    return {key,size:input.data.length,sha256:createHash("sha256").update(input.data).digest("hex")};
  }
  async read(key:string):Promise<Buffer>{ const target=resolve(this.base,key); if(relative(this.base,target).startsWith("..")) throw new Error("Caminho inválido."); return readFile(target); }
  async delete(key:string):Promise<void>{ const target=resolve(this.base,key); if(relative(this.base,target).startsWith("..")) throw new Error("Caminho inválido."); await rm(target,{force:true}); }
}
export function createStorageProvider():StorageProvider { if(env.storageDriver!=="local") throw new Error(`Storage driver não implementado: ${env.storageDriver}`); return new LocalStorageProvider(); }
