"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import type { SessionUser } from "@/lib/api";
export function UserMenu({user,admin}:{user:SessionUser;admin:boolean}){const router=useRouter();async function logout(){try{await clientApi("/api/v1/auth/logout",{method:"POST"});}finally{router.replace("/login");router.refresh();}}
return <details className="user-menu"><summary><span className="avatar">{user.name.slice(0,1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.roles.join(", ")||"Usuário"}</small></span></summary><div className="user-popover"><Link href={admin?"/admin/account":"/app/account"}>Configurações da conta</Link>{admin?<Link href="/app">Abrir aplicativo</Link>:(user.permissions.includes("*")||user.permissions.includes("admin.access"))&&<Link href="/admin">Abrir administração</Link>}<button type="button" onClick={logout}>Sair</button></div></details>}
