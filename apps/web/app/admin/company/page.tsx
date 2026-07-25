import { CompanyAdminClient } from "@/components/company-admin-client";
import { PageIntro } from "@/components/page-state";
import { serverApi } from "@/lib/api";
type Company={company_name:string;legal_name?:string;document_number?:string;email?:string;phone?:string;locale:string;timezone:string;address:Record<string,unknown>;branding:Record<string,unknown>};
export const metadata={title:"Empresa"};
export default async function CompanyPage(){const company=await serverApi<Company>("/api/v1/admin/company");return <><PageIntro title="Empresa" description="Identidade, contatos, endereço, idioma, fuso horário e aparência da instalação."/><CompanyAdminClient initial={company}/></>}
