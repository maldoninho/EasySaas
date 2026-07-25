import type { FastifyInstance } from "fastify";
import { query } from "@easysaas/database";
import { assert, ok } from "../lib/http.js";
import { requireAuth } from "../services/session.js";
function canAccess(permissions:string[],manifest:unknown):boolean { const m=manifest as {permissions?:unknown}; const required=Array.isArray(m?.permissions)?m.permissions.filter((p):p is string=>typeof p==="string"):[]; const access=required.find((p)=>p.endsWith(".access")); return !access||permissions.includes("*")||permissions.includes(access); }
export async function navigationRoutes(app:FastifyInstance):Promise<void>{
  app.get("/api/v1/navigation",{preHandler:requireAuth},async(request,reply)=>{
    const categories=await query<{id:string;name:string;slug:string;icon:string|null;mode:string;sort_order:number;direct_module_id:string|null}>("SELECT id,name,slug,icon,mode,sort_order,direct_module_id FROM app_categories WHERE enabled=true ORDER BY sort_order,name");
    const modules=await query<{id:string;stable_id:string;visual_name:string;slug:string;icon:string|null;category_id:string|null;sort_order:number;manifest:unknown}>("SELECT id,stable_id,visual_name,slug,icon,category_id,sort_order,manifest FROM app_modules WHERE status='active' AND visible=true ORDER BY sort_order,visual_name");
    const allowed=modules.rows.filter((m)=>canAccess(request.currentUser!.permissions,m.manifest));
    const data=categories.rows.map((category)=>{const children=allowed.filter((m)=>m.category_id===category.id).map((m)=>({id:m.id,stableId:m.stable_id,name:m.visual_name,slug:m.slug,icon:m.icon,path:`/app/${category.slug}/${m.slug}`}));const direct=category.direct_module_id?children.find((m)=>m.id===category.direct_module_id):undefined;return {id:category.id,name:category.name,slug:category.slug,icon:category.icon,mode:category.mode,path:direct?.path??(category.mode==="index"?`/app/${category.slug}`:undefined),modules:children};}).filter((c)=>c.mode==="index"||c.modules.length>0);
    return ok(reply,{dashboard:{name:"Dashboard",path:"/app"},categories:data,admin:request.currentUser!.permissions.includes("*")||request.currentUser!.permissions.includes("admin.access")});
  });
  app.get("/api/v1/navigation/resolve",{preHandler:requireAuth},async(request,reply)=>{
    const q=request.query as {category?:string;module?:string}; assert(q.category&&q.module,400,"PATH_REQUIRED","Caminho incompleto."); const result=await query<{id:string;stable_id:string;visual_name:string;description:string;status:string;manifest:unknown}>(`SELECT m.id,m.stable_id,m.visual_name,m.description,m.status,m.manifest FROM app_modules m JOIN app_categories c ON c.id=m.category_id WHERE c.slug=$1 AND m.slug=$2 AND c.enabled=true AND m.status='active' AND m.visible=true`,[q.category,q.module]);
    if(!result.rows[0]){const redirect=await query<{module_id:string}>("SELECT module_id FROM module_redirects WHERE old_path=$1 AND (expires_at IS NULL OR expires_at>now())",[`/app/${q.category}/${q.module}`]);if(redirect.rows[0]){const target=await query<{category_slug:string;module_slug:string}>("SELECT c.slug category_slug,m.slug module_slug FROM app_modules m JOIN app_categories c ON c.id=m.category_id WHERE m.id=$1",[redirect.rows[0].module_id]);return ok(reply,{redirectTo:target.rows[0]?`/app/${target.rows[0].category_slug}/${target.rows[0].module_slug}`:"/app"});}}
    assert(result.rows[0],404,"MODULE_NOT_FOUND","Módulo não encontrado ou indisponível."); assert(canAccess(request.currentUser!.permissions,result.rows[0].manifest),403,"MODULE_DENIED","Você não possui acesso a este módulo."); return ok(reply,{module:result.rows[0]});
  });
}
