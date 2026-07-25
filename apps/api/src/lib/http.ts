import type { FastifyReply, FastifyRequest } from "fastify";
export class HttpError extends Error { constructor(public readonly statusCode:number, public readonly code:string, message:string, public readonly details?:unknown){super(message);} }
export function assert(condition:unknown,status:number,code:string,message:string,details?:unknown):asserts condition { if(!condition) throw new HttpError(status,code,message,details); }
export function text(value:unknown,name:string,min=1,max=500):string { assert(typeof value==="string",400,"INVALID_FIELD",`${name} é obrigatório.`); const v=value.trim(); assert(v.length>=min&&v.length<=max,400,"INVALID_FIELD",`${name} deve ter entre ${min} e ${max} caracteres.`); return v; }
export function optionalText(value:unknown,max=500):string|undefined { if(value===undefined||value===null||value==="") return undefined; assert(typeof value==="string"&&value.trim().length<=max,400,"INVALID_FIELD","Texto inválido."); return value.trim(); }
export function email(value:unknown):string { const v=text(value,"E-mail",3,254).toLowerCase(); assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),400,"INVALID_EMAIL","E-mail inválido."); return v; }
export function booleanValue(value:unknown,fallback=false):boolean { return typeof value==="boolean"?value:fallback; }
export function jsonBody(request:FastifyRequest):Record<string,unknown>{ assert(request.body&&typeof request.body==="object"&&!Array.isArray(request.body),400,"INVALID_BODY","Corpo JSON inválido."); return request.body as Record<string,unknown>; }
export function ok(reply:FastifyReply,data:unknown,status=200){ return reply.status(status).send({data}); }
