"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi, errorMessage } from "@/lib/client-api";

type Category = { id: string; name: string };
type Version = { id: string; version: string; validation_status: string; installed_at: string; activated_at?: string; validation_report?: unknown };
type ModuleData = {
  id: string;
  stable_id: string;
  visual_name: string;
  slug: string;
  description: string;
  function_summary?: string;
  icon?: string;
  category_id?: string;
  sort_order: number;
  status: string;
  visible: boolean;
  active_version_id?: string;
};

export function ModuleDetailClient({ module, versions, categories }: { module: ModuleData; versions: Version[]; categories: Category[] }) {
  const router = useRouter();
  const [status, setStatus] = useState(module.status);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationDetails, setValidationDetails] = useState<unknown>();

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await clientApi(`/api/v1/admin/modules/${module.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: data.get("name"), slug: data.get("slug"), description: data.get("description"),
          functionSummary: data.get("functionSummary"), icon: data.get("icon"),
          categoryId: data.get("categoryId") || undefined, sortOrder: Number(data.get("sortOrder")),
          visible: data.get("visible") === "on",
        }),
      });
      setMessage("Dados administrativos salvos.");
      router.refresh();
    } catch (caught) { setError(errorMessage(caught)); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage(""); setValidating(true); setValidationDetails(undefined);
    const data = new FormData(event.currentTarget);
    try {
      const result = await clientApi<{ versionId: string; status: string; manifest: unknown; validation: unknown }>(`/api/v1/admin/modules/${module.id}/upload`, { method: "POST", body: data });
      setMessage("Pacote validado e salvo como nova versão inativa.");
      setStatus(result.status);
      setValidationDetails(result.validation);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught && typeof caught === "object" && "details" in caught) setValidationDetails((caught as { details?: unknown }).details);
    } finally { setValidating(false); }
  }

  async function activate(versionId: string) {
    setError("");
    try {
      const result = await clientApi<{ jobId: string }>(`/api/v1/admin/modules/${module.id}/activate`, { method: "POST", body: JSON.stringify({ versionId }) });
      setMessage(`Atualização enviada para validação final e build. Job: ${result.jobId}`);
      setStatus("validating");
    } catch (caught) { setError(errorMessage(caught)); }
  }

  async function deactivate() {
    if (!confirm("Desativar o módulo? Ele será removido do menu e terá acesso bloqueado.")) return;
    try { await clientApi(`/api/v1/admin/modules/${module.id}/deactivate`, { method: "POST" }); setStatus("inactive"); setMessage("Módulo desativado."); }
    catch (caught) { setError(errorMessage(caught)); }
  }

  return (
    <div className="admin-stack">
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}
      <section className="panel">
        <div className="panel-heading"><h2>Configuração</h2><span className={`status-badge status-${status}`}>{status}</span></div>
        <form className="form-stack" onSubmit={saveMetadata}>
          <div className="compact-grid">
            <label className="field"><span>Nome visual</span><input name="name" defaultValue={module.visual_name} /></label>
            <label className="field"><span>Identificador permanente</span><input value={module.stable_id} disabled /></label>
            <label className="field"><span>Slug</span><input name="slug" defaultValue={module.slug} /></label>
            <label className="field"><span>Ícone</span><input name="icon" defaultValue={module.icon} /></label>
            <label className="field"><span>Categoria</span><select name="categoryId" defaultValue={module.category_id ?? ""}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="field"><span>Posição</span><input name="sortOrder" type="number" defaultValue={module.sort_order} /></label>
          </div>
          <label className="field"><span>Função</span><textarea name="functionSummary" rows={3} defaultValue={module.function_summary} /></label>
          <label className="field"><span>Descrição</span><textarea name="description" rows={4} defaultValue={module.description} /></label>
          <label className="checkbox-field"><input name="visible" type="checkbox" defaultChecked={module.visible} /> Visível quando estiver ativo</label>
          <div className="button-row"><button className="button button-primary">Salvar configuração</button>{status === "active" && <button className="button button-danger" type="button" onClick={deactivate}>Desativar</button>}</div>
        </form>
      </section>

      <section className="panel">
        <h2>Carregar nova implementação</h2>
        <p>O pacote vai para quarentena, é extraído com proteção, tem o manifesto comparado ao código e só então vira uma versão disponível.</p>
        <form className="form-stack" onSubmit={upload}>
          <label className="file-field"><input name="file" type="file" accept=".zip,application/zip" required /><span>Selecionar pacote ZIP do módulo</span></label>
          <button className="button button-primary" disabled={validating}>{validating ? "Validando pacote..." : "Carregar e testar"}</button>
        </form>
        {validationDetails !== undefined && <pre className="report-box">{JSON.stringify(validationDetails, null, 2)}</pre>}
      </section>

      <section className="panel">
        <h2>Versões</h2>
        <div className="table-wrap"><table><thead><tr><th>Versão</th><th>Validação</th><th>Instalada</th><th>Estado</th><th></th></tr></thead><tbody>{versions.map((version) => <tr key={version.id}><td><strong>{version.version}</strong></td><td><span className={`status-badge status-${version.validation_status}`}>{version.validation_status}</span></td><td>{new Date(version.installed_at).toLocaleString("pt-BR")}</td><td>{module.active_version_id === version.id ? "Ativa" : version.activated_at ? "Arquivada" : "Disponível"}</td><td>{module.active_version_id !== version.id && version.validation_status === "passed" && <button className="link-button" onClick={() => activate(version.id)}>Ativar esta versão</button>}</td></tr>)}</tbody></table></div>
        {!versions.length && <p className="muted-text">Nenhuma versão carregada. A estrutura vazia continua disponível apenas para desenvolvimento.</p>}
      </section>
    </div>
  );
}
