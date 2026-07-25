"use client";

import { useState } from "react";
import { clientApi, errorMessage } from "@/lib/client-api";

type Runtime = { node: string; environment: string; appUrl: string; smtpMode: string; storageDriver: string };
type Health = { database: string; failedJobs24h: number; timestamp: string };
type Job = { id: string; type: string; status: string; attempts: number; max_attempts: number; last_error?: string; created_at: string };

export function SystemAdminClient({ runtime, health, jobs }: { runtime: Runtime; health: Health; jobs: Job[] }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function backup() { try { const result = await clientApi<{jobId:string}>("/api/v1/admin/backups", { method: "POST" }); setMessage(`Backup colocado na fila: ${result.jobId}`); } catch (caught) { setError(errorMessage(caught)); } }
  return <div className="admin-stack">{message&&<div className="notice success">{message}</div>}{error&&<div className="notice error">{error}</div>}<div className="metric-grid"><article className="metric-card"><span>Banco</span><strong>{health.database}</strong></article><article className="metric-card"><span>Jobs falhos em 24h</span><strong>{health.failedJobs24h}</strong></article><article className="metric-card"><span>Node.js</span><strong>{runtime.node}</strong></article><article className="metric-card"><span>Ambiente</span><strong>{runtime.environment}</strong></article></div><section className="panel"><div className="panel-heading"><h2>Operação</h2><button className="button button-primary" onClick={backup}>Criar backup</button></div><dl className="definition-list"><div><dt>URL pública</dt><dd>{runtime.appUrl}</dd></div><div><dt>E-mail</dt><dd>{runtime.smtpMode}</dd></div><div><dt>Armazenamento</dt><dd>{runtime.storageDriver}</dd></div><div><dt>Verificação</dt><dd>{new Date(health.timestamp).toLocaleString("pt-BR")}</dd></div></dl></section><section className="panel"><h2>Jobs recentes</h2><div className="table-wrap"><table><thead><tr><th>Tipo</th><th>Status</th><th>Tentativas</th><th>Criado</th><th>Erro</th></tr></thead><tbody>{jobs.map((job)=><tr key={job.id}><td>{job.type}</td><td><span className={`status-badge status-${job.status}`}>{job.status}</span></td><td>{job.attempts}/{job.max_attempts}</td><td>{new Date(job.created_at).toLocaleString("pt-BR")}</td><td className="error-cell">{job.last_error??"—"}</td></tr>)}</tbody></table></div></section></div>;
}
