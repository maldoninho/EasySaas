"use client";

import { type FormEvent, useState } from "react";
import { clientApi, errorMessage } from "@/lib/client-api";

type Section = { id: string; type: string; name: string; enabled: boolean; sort_order: number; content: Record<string, unknown> };
type Landing = { page: { enabled: boolean; status: string; seo: Record<string, unknown> }; sections: Section[] };

export function LandingAdminClient({ initial }: { initial: Landing }) {
  const [sections, setSections] = useState(initial.sections);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await clientApi("/api/v1/admin/landing/settings", {
        method: "PUT",
        body: JSON.stringify({
          enabled: data.get("enabled") === "on",
          seo: { title: data.get("seoTitle"), description: data.get("seoDescription") },
        }),
      });
      setMessage("Configuração da landing salva como rascunho.");
    } catch (caught) { setError(errorMessage(caught)); }
  }

  async function saveSection(section: Section, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const content = JSON.parse(String(data.get("content")));
      await clientApi(`/api/v1/admin/landing/sections/${section.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: data.get("name"), enabled: data.get("enabled") === "on", sortOrder: Number(data.get("sortOrder")), content }),
      });
      setMessage(`Seção “${section.name}” atualizada.`);
    } catch (caught) { setError(caught instanceof SyntaxError ? "O conteúdo JSON da seção é inválido." : errorMessage(caught)); }
  }

  async function publish() {
    try { const result = await clientApi<{ versionId: string }>("/api/v1/admin/landing/publish", { method: "POST" }); setMessage(`Landing publicada. Versão ${result.versionId}.`); }
    catch (caught) { setError(errorMessage(caught)); }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setSections(next);
    void clientApi("/api/v1/admin/landing/reorder", { method: "POST", body: JSON.stringify({ ids: next.map((item) => item.id) }) }).catch((caught) => setError(errorMessage(caught)));
  }

  return (
    <div className="admin-stack">
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}
      <section className="panel">
        <div className="panel-heading"><h2>Publicação</h2><span className={`status-badge status-${initial.page.status}`}>{initial.page.status}</span></div>
        <form className="form-stack" onSubmit={saveSettings}>
          <label className="checkbox-field"><input name="enabled" type="checkbox" defaultChecked={initial.page.enabled} /> Landing pública ativa</label>
          <label className="field"><span>Título SEO</span><input name="seoTitle" defaultValue={String(initial.page.seo.title ?? "EasySaaS")} /></label>
          <label className="field"><span>Descrição SEO</span><textarea name="seoDescription" rows={3} defaultValue={String(initial.page.seo.description ?? "")} /></label>
          <div className="button-row"><button className="button button-secondary">Salvar rascunho</button><button className="button button-primary" type="button" onClick={publish}>Publicar versão</button><a className="button button-secondary" href="/" target="_blank" rel="noreferrer">Abrir prévia pública</a></div>
        </form>
      </section>
      <section className="panel">
        <h2>Seções</h2>
        <p className="muted-text">O conteúdo é estruturado. HTML e JavaScript arbitrários não são aceitos.</p>
        <div className="landing-section-editors">
          {sections.map((section, index) => (
            <form className="section-editor" key={section.id} onSubmit={(event: FormEvent<HTMLFormElement>) => saveSection(section, event)}>
              <div className="section-editor-header">
                <div><strong>{section.name}</strong><small>{section.type}</small></div>
                <div className="table-actions"><button type="button" className="link-button" onClick={() => move(index, -1)}>↑</button><button type="button" className="link-button" onClick={() => move(index, 1)}>↓</button><button className="link-button">Salvar</button></div>
              </div>
              <div className="compact-grid">
                <label className="field"><span>Nome interno</span><input name="name" defaultValue={section.name} /></label>
                <label className="field"><span>Posição</span><input name="sortOrder" type="number" defaultValue={section.sort_order} /></label>
                <label className="checkbox-field"><input name="enabled" type="checkbox" defaultChecked={section.enabled} /> Ativa</label>
              </div>
              <label className="field"><span>Conteúdo estruturado (JSON)</span><textarea className="code-textarea" name="content" rows={12} defaultValue={JSON.stringify(section.content, null, 2)} /></label>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
