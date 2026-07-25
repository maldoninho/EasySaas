"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { clientApi, errorMessage } from "@/lib/client-api";

type ModuleSummary = {
  id: string;
  stableId: string;
  name: string;
  slug: string;
  status: string;
  visible: boolean;
  sortOrder: number;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  mode: string;
  sort_order: number;
  enabled: boolean;
  modules: ModuleSummary[];
};

export function AdminApplicationClient({ initial }: { initial: Category[] }) {
  const [categories, setCategories] = useState(initial);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await clientApi("/api/v1/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          slug: data.get("slug"),
          icon: data.get("icon"),
          mode: data.get("mode"),
          enabled: true,
          sortOrder: (categories.length + 1) * 10,
        }),
      });
      location.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function update(category: Category, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await clientApi(`/api/v1/admin/categories/${category.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: data.get("name"),
          slug: data.get("slug"),
          description: data.get("description"),
          icon: data.get("icon"),
          mode: data.get("mode"),
          sortOrder: Number(data.get("sortOrder")),
          enabled: data.get("enabled") === "on",
          directModuleId: data.get("directModuleId") || undefined,
        }),
      });
      setMessage("Categoria atualizada.");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function remove(category: Category) {
    if (!confirm(`Excluir a categoria ${category.name}? Os módulos ficarão sem categoria e invisíveis.`)) return;
    try {
      await clientApi(`/api/v1/admin/categories/${category.id}`, {
        method: "DELETE",
        body: JSON.stringify({ action: "unassign" }),
      });
      setCategories((items) => items.filter((item) => item.id !== category.id));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="admin-stack">
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <section className="panel">
        <h2>Nova categoria</h2>
        <form className="inline-form" onSubmit={create}>
          <label className="field"><span>Nome</span><input name="name" required /></label>
          <label className="field"><span>Slug opcional</span><input name="slug" /></label>
          <label className="field"><span>Ícone</span><input name="icon" placeholder="◆" /></label>
          <label className="field">
            <span>Modo</span>
            <select name="mode">
              <option value="group">Agrupadora</option>
              <option value="direct">Link direto</option>
              <option value="index">Página de índice</option>
            </select>
          </label>
          <button className="button button-primary">Criar categoria</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Estrutura do aplicativo</h2>
          <Link className="button button-primary" href="/admin/modules/new">Criar módulo</Link>
        </div>
        <div className="category-editor-list">
          {categories.map((category) => (
            <article className="category-editor" key={category.id}>
              <form onSubmit={(event: FormEvent<HTMLFormElement>) => update(category, event)}>
                <div className="category-editor-header">
                  <strong>{category.icon || "◇"} {category.name}</strong>
                  <div className="table-actions">
                    <button className="link-button" type="submit">Salvar</button>
                    <button className="link-button danger" type="button" onClick={() => remove(category)}>Excluir</button>
                  </div>
                </div>
                <div className="compact-grid">
                  <label className="field"><span>Nome</span><input name="name" defaultValue={category.name} /></label>
                  <label className="field"><span>Slug</span><input name="slug" defaultValue={category.slug} /></label>
                  <label className="field"><span>Ícone</span><input name="icon" defaultValue={category.icon} /></label>
                  <label className="field"><span>Posição</span><input name="sortOrder" type="number" defaultValue={category.sort_order} /></label>
                  <label className="field">
                    <span>Modo</span>
                    <select name="mode" defaultValue={category.mode}>
                      <option value="group">Agrupadora</option>
                      <option value="direct">Link direto</option>
                      <option value="index">Índice</option>
                    </select>
                  </label>
                  <label className="checkbox-field"><input name="enabled" type="checkbox" defaultChecked={category.enabled} /> Ativa</label>
                  {category.mode === "direct" && (
                    <label className="field">
                      <span>Módulo direto</span>
                      <select name="directModuleId" defaultValue="">
                        <option value="">Selecione</option>
                        {category.modules.map((module) => <option key={module.id} value={module.id}>{module.name}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              </form>
              <div className="category-modules">
                {category.modules.length ? category.modules.map((module) => (
                  <Link href={`/admin/modules/${module.id}`} key={module.id} className="category-module-row">
                    <span>{module.name}</span>
                    <span className={`status-badge status-${module.status}`}>{module.status}</span>
                  </Link>
                )) : <p className="muted-text">Nenhum módulo atribuído.</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
