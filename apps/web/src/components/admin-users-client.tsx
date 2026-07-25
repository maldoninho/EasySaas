"use client";

import { type FormEvent, useMemo, useState } from "react";
import { clientApi, errorMessage } from "@/lib/client-api";

type Permission = { id: string; key: string; description: string };
type Role = { id: string; key: string; name: string; is_owner: boolean; is_system?: boolean; permissions?: string[] };
type User = { id: string; email: string; name: string; status: string; created_at: string; last_login_at?: string; roles: Role[] };

export function AdminUsersClient({ initialUsers, roles: initialRoles, permissions }: { initialUsers: User[]; roles: Role[]; permissions: Permission[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [roles, setRoles] = useState(initialRoles);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const defaultRole = useMemo(() => roles.find((role) => role.key === "user")?.id ?? roles[0]?.id, [roles]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      await clientApi("/api/v1/admin/users/invite", {
        method: "POST",
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), roleIds: [data.get("roleId") || defaultRole] }),
      });
      setMessage("Convite criado e colocado na fila de envio.");
      event.currentTarget.reset();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function status(id: string, next: string) {
    setError("");
    setMessage("");
    try {
      await clientApi(`/api/v1/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      setUsers((items) => items.map((user) => (user.id === id ? { ...user, status: next } : user)));
      setMessage(next === "active" ? "Usuário ativado." : "Usuário bloqueado.");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function saveRoles(user: User, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const roleIds = data.getAll("roleIds").map(String);
    try {
      await clientApi(`/api/v1/admin/users/${user.id}/roles`, {
        method: "PUT",
        body: JSON.stringify({ roleIds, currentPassword: data.get("currentPassword") || undefined }),
      });
      const selectedRoles = roles.filter((role) => roleIds.includes(role.id));
      setUsers((items) => items.map((item) => (item.id === user.id ? { ...item, roles: selectedRoles } : item)));
      setMessage(`Papéis de ${user.name} atualizados.`);
      form.reset();
      for (const role of selectedRoles) {
        const checkbox = form.elements.namedItem("roleIds");
        if (checkbox instanceof RadioNodeList) {
          for (const element of Array.from(checkbox)) {
            if (element instanceof HTMLInputElement && element.value === role.id) element.checked = true;
          }
        }
      }
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function revokeSessions(id: string) {
    setError("");
    setMessage("");
    try {
      await clientApi(`/api/v1/admin/users/${id}/revoke-sessions`, { method: "POST" });
      setMessage("Sessões revogadas.");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const permissionIds = data.getAll("permissionIds").map(String);
    try {
      const result = await clientApi<{ id: string }>("/api/v1/admin/roles", {
        method: "POST",
        body: JSON.stringify({ key: data.get("key"), name: data.get("name"), description: data.get("description"), permissionIds }),
      });
      setRoles((items) => [
        ...items,
        {
          id: result.id,
          key: String(data.get("key")),
          name: String(data.get("name")),
          is_owner: false,
          is_system: false,
          permissions: permissions.filter((permission) => permissionIds.includes(permission.id)).map((permission) => permission.key),
        },
      ]);
      setMessage("Papel criado.");
      event.currentTarget.reset();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="admin-stack">
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <section className="panel">
        <h2>Convidar usuário</h2>
        <form className="inline-form" onSubmit={invite}>
          <label className="field"><span>Nome</span><input name="name" /></label>
          <label className="field"><span>E-mail</span><input name="email" type="email" required /></label>
          <label className="field"><span>Papel</span><select name="roleId" defaultValue={defaultRole}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          <button className="button button-primary">Enviar convite</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>Usuários</h2><span>{users.length}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Usuário</th><th>Papéis</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong><small>{user.email}</small></td>
                  <td>{user.roles.map((role) => role.name).join(", ") || "Sem papel"}</td>
                  <td><span className={`status-badge status-${user.status}`}>{user.status}</span></td>
                  <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString("pt-BR") : "Nunca"}</td>
                  <td>
                    <div className="table-actions">
                      {user.status === "active" ? <button className="link-button danger" onClick={() => status(user.id, "blocked")}>Bloquear</button> : <button className="link-button" onClick={() => status(user.id, "active")}>Ativar</button>}
                      <button className="link-button" onClick={() => revokeSessions(user.id)}>Revogar sessões</button>
                    </div>
                    <details className="role-assignment">
                      <summary>Gerenciar papéis</summary>
                      <form className="form-stack" onSubmit={(event: FormEvent<HTMLFormElement>) => saveRoles(user, event)}>
                        <div className="permission-grid compact-permission-grid">
                          {roles.map((role) => (
                            <label className="checkbox-field" key={role.id}>
                              <input type="checkbox" name="roleIds" value={role.id} defaultChecked={user.roles.some((assigned) => assigned.id === role.id)} />
                              {role.name}
                            </label>
                          ))}
                        </div>
                        <label className="field">
                          <span>Senha atual (obrigatória ao conceder Proprietário ou Super Admin)</span>
                          <input name="currentPassword" type="password" autoComplete="current-password" />
                        </label>
                        <button className="button button-secondary">Salvar papéis</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Papéis e permissões</h2>
        <div className="role-grid">
          {roles.map((role) => <article className="feature-card" key={role.id}><h3>{role.name}</h3><p>{role.key}</p><small>{role.permissions?.join(", ") || "Sem permissões detalhadas"}</small>{role.is_system && <span className="status-badge">Sistema</span>}</article>)}
        </div>
      </section>

      <section className="panel">
        <h2>Novo papel</h2>
        <form className="form-stack" onSubmit={createRole}>
          <div className="compact-grid"><label className="field"><span>Nome</span><input name="name" required /></label><label className="field"><span>Chave</span><input name="key" pattern="[a-z0-9-]+" required /></label></div>
          <label className="field"><span>Descrição</span><textarea name="description" rows={3} /></label>
          <div className="permission-grid">{permissions.filter((permission) => permission.key !== "*").map((permission) => <label className="checkbox-field" key={permission.id}><input type="checkbox" name="permissionIds" value={permission.id} /> {permission.key}</label>)}</div>
          <button className="button button-primary">Criar papel</button>
        </form>
      </section>
    </div>
  );
}
