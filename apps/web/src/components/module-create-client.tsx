"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi, errorMessage } from "@/lib/client-api";

type Category = { id: string; name: string };

export function ModuleCreateClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await clientApi<{ id: string }>("/api/v1/admin/modules", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          stableId: data.get("stableId"),
          description: data.get("description"),
          functionSummary: data.get("functionSummary"),
          icon: data.get("icon"),
          categoryId: data.get("categoryId") || undefined,
          sortOrder: Number(data.get("sortOrder") || 100),
        }),
      });
      router.push(`/admin/modules/${result.id}`);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      setLoading(false);
    }
  }

  return (
    <form className="panel form-stack form-wide" onSubmit={submit}>
      <div className="compact-grid">
        <label className="field"><span>Nome do módulo</span><input name="name" required /></label>
        <label className="field"><span>Identificador técnico opcional</span><input name="stableId" placeholder="gerador-de-artigos" /></label>
        <label className="field"><span>Ícone</span><input name="icon" placeholder="◆" /></label>
        <label className="field"><span>Posição</span><input name="sortOrder" type="number" defaultValue={100} /></label>
        <label className="field">
          <span>Categoria</span>
          <select name="categoryId" defaultValue="">
            <option value="">Sem categoria</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      </div>
      <label className="field"><span>Função</span><textarea name="functionSummary" rows={3} /></label>
      <label className="field"><span>Descrição</span><textarea name="description" rows={5} required /></label>
      <div className="notice info">Sem arquivo carregado, o sistema criará a pasta, o manifesto, o ponto de entrada e uma view mínima. O módulo ficará como estrutura e não aparecerá para usuários comuns.</div>
      {error && <div className="notice error">{error}</div>}
      <button className="button button-primary" disabled={loading}>{loading ? "Criando estrutura..." : "Criar módulo vazio"}</button>
    </form>
  );
}
