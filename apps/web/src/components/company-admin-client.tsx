"use client";

import { type FormEvent, useState } from "react";
import { clientApi, errorMessage } from "@/lib/client-api";

type Company = {
  company_name: string; legal_name?: string; document_number?: string; email?: string; phone?: string;
  locale: string; timezone: string; address: Record<string, unknown>; branding: Record<string, unknown>;
};

export function CompanyAdminClient({ initial }: { initial: Company }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await clientApi("/api/v1/admin/company", {
        method: "PUT",
        body: JSON.stringify({
          companyName: data.get("companyName"), legalName: data.get("legalName"), documentNumber: data.get("documentNumber"),
          email: data.get("email"), phone: data.get("phone"), locale: data.get("locale"), timezone: data.get("timezone"),
          address: { street: data.get("street"), city: data.get("city"), state: data.get("state"), postalCode: data.get("postalCode"), country: data.get("country") },
          branding: { accent: data.get("accent"), appearance: data.get("appearance") },
        }),
      });
      setMessage("Dados da empresa atualizados.");
    } catch (caught) { setError(errorMessage(caught)); }
  }
  const address = initial.address ?? {};
  return <form className="panel form-stack form-wide" onSubmit={submit}>{message&&<div className="notice success">{message}</div>}{error&&<div className="notice error">{error}</div>}<div className="compact-grid"><label className="field"><span>Nome da empresa</span><input name="companyName" defaultValue={initial.company_name}/></label><label className="field"><span>Razão social</span><input name="legalName" defaultValue={initial.legal_name}/></label><label className="field"><span>Documento</span><input name="documentNumber" defaultValue={initial.document_number}/></label><label className="field"><span>E-mail</span><input name="email" type="email" defaultValue={initial.email}/></label><label className="field"><span>Telefone</span><input name="phone" defaultValue={initial.phone}/></label><label className="field"><span>Idioma</span><input name="locale" defaultValue={initial.locale}/></label><label className="field"><span>Fuso horário</span><input name="timezone" defaultValue={initial.timezone}/></label><label className="field"><span>Cor principal</span><input name="accent" type="color" defaultValue={String(initial.branding?.accent??"#2563eb")}/></label><label className="field"><span>Aparência</span><select name="appearance" defaultValue={String(initial.branding?.appearance??"system")}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label></div><h2>Endereço</h2><div className="compact-grid"><label className="field"><span>Logradouro</span><input name="street" defaultValue={String(address.street??"")}/></label><label className="field"><span>Cidade</span><input name="city" defaultValue={String(address.city??"")}/></label><label className="field"><span>Estado</span><input name="state" defaultValue={String(address.state??"")}/></label><label className="field"><span>CEP</span><input name="postalCode" defaultValue={String(address.postalCode??"")}/></label><label className="field"><span>País</span><input name="country" defaultValue={String(address.country??"Brasil")}/></label></div><button className="button button-primary">Salvar dados da empresa</button></form>;
}
