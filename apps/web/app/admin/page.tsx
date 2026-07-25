import Link from "next/link";
import { PageIntro } from "@/components/page-state";
import { serverApi } from "@/lib/api";

type Dashboard = {
  metrics: { activeUsers: number; activeModules: number; moduleErrors: number; securityAlerts: number; pendingJobs: number };
  recentActivity: Array<{ action: string; target_type?: string; target_id?: string; created_at: string }>;
};
export const metadata = { title: "Administração" };
export default async function AdminDashboard() {
  const data = await serverApi<Dashboard>("/api/v1/admin/dashboard");
  return <><PageIntro title="Dashboard administrativo" description="Controle central da instalação, usuários, módulos, segurança e operação." />
    <div className="metric-grid">
      <article className="metric-card"><span>Usuários ativos</span><strong>{data.metrics.activeUsers}</strong><Link href="/admin/users">Gerenciar</Link></article>
      <article className="metric-card"><span>Módulos ativos</span><strong>{data.metrics.activeModules}</strong><Link href="/admin/modules">Gerenciar</Link></article>
      <article className="metric-card"><span>Módulos com erro</span><strong>{data.metrics.moduleErrors}</strong><Link href="/admin/modules">Revisar</Link></article>
      <article className="metric-card"><span>Alertas de segurança</span><strong>{data.metrics.securityAlerts}</strong><Link href="/admin/security">Revisar</Link></article>
      <article className="metric-card"><span>Jobs pendentes/falhos</span><strong>{data.metrics.pendingJobs}</strong><Link href="/admin/system">Operação</Link></article>
    </div>
    <section className="panel"><div className="panel-heading"><h2>Atividade administrativa recente</h2><Link href="/admin/audit">Ver auditoria completa</Link></div>
      <ul className="activity-list">{data.recentActivity.map((item, index) => <li key={`${item.created_at}-${index}`}><strong>{item.action}</strong><span>{item.target_type ?? "sistema"}{item.target_id ? ` · ${item.target_id}` : ""}</span><small>{new Date(item.created_at).toLocaleString("pt-BR")}</small></li>)}</ul>
    </section></>;
}
