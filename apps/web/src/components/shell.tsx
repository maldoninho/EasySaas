import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser, serverApi, type SessionUser } from "@/lib/api";
import { UserMenu } from "./user-menu";

type Navigation={dashboard:{name:string;path:string};categories:Array<{id:string;name:string;slug:string;icon?:string;mode:string;path?:string;modules:Array<{id:string;name:string;path:string;icon?:string}>}>;admin:boolean};
const adminNav=[
  {label:"Dashboard",href:"/admin"},{label:"Aplicativo",href:"/admin/application"},{label:"Módulos",href:"/admin/modules"},{label:"Landing Page",href:"/admin/landing"},
  {label:"Usuários e Acesso",href:"/admin/users"},{label:"Empresa",href:"/admin/company"},{label:"Segurança",href:"/admin/security"},{label:"Sistema",href:"/admin/system"},{label:"Auditoria",href:"/admin/audit"}
];
export async function ApplicationShell({children,admin=false,title}:{children:ReactNode;admin?:boolean;title?:string}){
  const user=await requireUser({admin});let navigation:Navigation|undefined;if(!admin)navigation=await serverApi<Navigation>("/api/v1/navigation");
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><Link href={admin?"/admin":"/app"} className="brand-link"><span className="brand-symbol">E</span><span>EasySaaS</span></Link><span className="context-badge">{admin?"Admin":"App"}</span></div>
      <nav className="sidebar-nav" aria-label={admin?"Administração":"Aplicativo"}>
        {admin?adminNav.map((item)=><Link key={item.href} href={item.href} className="nav-link">{item.label}</Link>):<>
          <Link href="/app" className="nav-link nav-dashboard">Dashboard</Link>
          {navigation?.categories.map((category)=>category.mode==="direct"&&category.path?<Link key={category.id} href={category.path} className="nav-link">{category.icon&&<span>{category.icon}</span>}{category.name}</Link>:<details key={category.id} className="nav-group" open><summary>{category.icon&&<span>{category.icon}</span>}{category.name}</summary>{category.mode==="index"&&category.path&&<Link href={category.path} className="nav-child">Visão geral</Link>}{category.modules.map((module)=><Link key={module.id} href={module.path} className="nav-child">{module.icon&&<span>{module.icon}</span>}{module.name}</Link>)}</details>)}
        </>}
      </nav>
      <UserMenu user={user} admin={admin} />
    </aside>
    <main className="content-shell"><header className="content-header"><div><span className="mobile-brand">EasySaaS</span>{title&&<h1>{title}</h1>}</div></header><div className="content-body">{children}</div></main>
  </div>;
}
