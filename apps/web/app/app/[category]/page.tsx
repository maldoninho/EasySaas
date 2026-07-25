import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageIntro } from "@/components/page-state";
import { serverApi } from "@/lib/api";
export default async function CategoryPage({params}:{params:Promise<{category:string}>}){const {category}=await params;const nav=await serverApi<{categories:Array<{slug:string;name:string;modules:Array<{id:string;name:string;path:string;icon?:string}>}>}>("/api/v1/navigation");const item=nav.categories.find((c)=>c.slug===category);if(!item)notFound();return <><PageIntro title={item.name} description="Escolha uma funcionalidade desta categoria."/>{item.modules.length?<div className="module-card-grid">{item.modules.map((m)=><Link className="module-card" href={m.path} key={m.id}><span className="module-icon">{m.icon??"◆"}</span><strong>{m.name}</strong><span>→</span></Link>)}</div>:<EmptyState title="Categoria vazia" description="Nenhum módulo ativo está disponível nesta categoria."/>}</>}
