"use client";

import { type FormEvent, useState } from "react";
import { clientApi, errorMessage } from "@/lib/client-api";

type SecurityConfig = {
  captchaMode?: string;
  singleSession?: boolean;
  publicSignup?: boolean;
  sessionTtlHours?: number;
  adminMfaRequired?: boolean;
  mfaPolicy?: string;
};

export function SecurityAdminClient({ initial }: { initial: SecurityConfig }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const mfaPolicy = String(data.get("mfaPolicy") ?? "optional");
    try {
      await clientApi("/api/v1/admin/system/settings/security", {
        method: "PUT",
        body: JSON.stringify({ value: {
          captchaMode: data.get("captchaMode"),
          singleSession: data.get("singleSession") === "on",
          publicSignup: data.get("publicSignup") === "on",
          sessionTtlHours: Number(data.get("sessionTtlHours")),
          mfaPolicy,
          adminMfaRequired: mfaPolicy === "all" || mfaPolicy === "owner-only" || mfaPolicy === "selected-roles",
        } }),
      });
      setMessage("Política de segurança salva.");
    } catch (caught) { setError(errorMessage(caught)); }
  }
  return (
    <form className="panel form-stack form-wide" onSubmit={submit}>
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      {/* CAPTCHA */}
      <h3 className="section-title">CAPTCHA e proteção anti-robô</h3>
      <label className="field">
        <span>Modo CAPTCHA</span>
        <select name="captchaMode" defaultValue={initial.captchaMode ?? "always"}>
          <option value="off">Desativado</option>
          <option value="adaptive">Adaptativo (falhas + suspeito)</option>
          <option value="always">Sempre ativo</option>
        </select>
      </label>

      <h3 className="section-title">Sessão e cadastro</h3>
      <label className="field">
        <span>Duração da sessão em horas</span>
        <input name="sessionTtlHours" type="number" min={1} max={168} defaultValue={initial.sessionTtlHours ?? 12} />
      </label>
      <label className="checkbox-field">
        <input name="singleSession" type="checkbox" defaultChecked={initial.singleSession ?? true} />
        Permitir somente uma sessão ativa por usuário
      </label>
      <label className="checkbox-field">
        <input name="publicSignup" type="checkbox" defaultChecked={initial.publicSignup ?? false} />
        Permitir cadastro público
      </label>

      {/* MFA */}
      <h3 className="section-title">Autenticação multifator (MFA / TOTP)</h3>
      <label className="field">
        <span>Política de MFA</span>
        <select name="mfaPolicy" defaultValue={initial.mfaPolicy ?? "optional"}>
          <option value="disabled">Desativado (ninguém pode configurar)</option>
          <option value="optional">Opcional por usuário (padrão)</option>
          <option value="owner-only">Obrigatório para Owner e Super Admin</option>
          <option value="all">Obrigatório para todos</option>
        </select>
      </label>

      <button className="button button-primary">Salvar política</button>
    </form>
  );
}
