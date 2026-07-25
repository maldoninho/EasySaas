import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
const internal=process.env.API_INTERNAL_URL??"http://127.0.0.1:4000";
export async function serverApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const cookieStore=await cookies();const headerStore=await headers();const response=await fetch(`${internal}${path}`,{...init,cache:"no-store",headers:{accept:"application/json",cookie:cookieStore.toString(),"x-request-id":headerStore.get("x-request-id")??crypto.randomUUID(),...init.headers}});
  const payload=await response.json().catch(()=>({error:{message:"Resposta inválida da API."}}));if(!response.ok)throw Object.assign(new Error(payload?.error?.message??"Falha na API."),{status:response.status,code:payload?.error?.code,details:payload?.error?.details});return payload.data as T;
}
export interface SessionUser {id:string;email:string;name:string;roles:string[];permissions:string[];}
export async function requireUser(options:{admin?:boolean}={}):Promise<SessionUser>{
  let result:{authenticated:boolean;user:SessionUser|null};try{result=await serverApi("/api/v1/auth/me");}catch{redirect("/login");}
  if(!result.authenticated||!result.user)redirect("/login");if(options.admin&&!result.user.permissions.includes("*")&&!result.user.permissions.includes("admin.access"))redirect("/app");return result.user;
}
export function hasPermission(user:SessionUser,permission:string):boolean{return user.permissions.includes("*")||user.permissions.includes(permission);}
