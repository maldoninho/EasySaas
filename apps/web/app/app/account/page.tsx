import { AccountClient } from "@/components/account-client";
import { PageIntro } from "@/components/page-state";
import { requireUser, serverApi } from "@/lib/api";
type AccountData={profile:{name:string;email:string;theme:string;locale:string;timezone:string}};
type SessionData={id:string;user_agent?:string;created_at:string;last_seen_at:string;expires_at:string;current:boolean};
export const metadata={title:"Minha conta"};
export default async function AccountPage(){await requireUser();const [account,sessions]=await Promise.all([serverApi<AccountData>("/api/v1/account"),serverApi<SessionData[]>("/api/v1/account/sessions")]);return <><PageIntro title="Configurações da conta" description="Gerencie perfil, segurança, preferências e dispositivos conectados."/><AccountClient initial={account} sessions={sessions}/></>}
