"use client";
function cookie(name:string):string|undefined{return document.cookie.split("; ").find((part)=>part.startsWith(`${name}=`))?.split("=").slice(1).join("=");}
export async function clientApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const method=(init.method??"GET").toUpperCase();const headers=new Headers(init.headers);headers.set("accept","application/json");if(init.body&&!headers.has("content-type")&&!(init.body instanceof FormData))headers.set("content-type","application/json");if(!["GET","HEAD","OPTIONS"].includes(method)){const csrf=cookie("easysaas_csrf");if(csrf)headers.set("x-csrf-token",decodeURIComponent(csrf));}
  const response=await fetch(path,{...init,headers,credentials:"same-origin"});const payload=await response.json().catch(()=>({error:{message:"Resposta inválida."}}));if(!response.ok)throw Object.assign(new Error(payload?.error?.message??"Falha na operação."),{code:payload?.error?.code,details:payload?.error?.details,status:response.status});return payload.data as T;
}
export function errorMessage(error:unknown):string{return error instanceof Error?error.message:"Ocorreu um erro inesperado.";}
