import { PageIntro } from "@/components/page-state";
import { SecurityAdminClient } from "@/components/security-admin-client";
import { serverApi } from "@/lib/api";
type SystemData={settings:Array<{key:string;value:Record<string,unknown>}>};
export const metadata={title:"Segurança"};
export default async function SecurityPage(){const data=await serverApi<SystemData>("/api/v1/admin/system");const security=data.settings.find((item)=>item.key==="security")?.value??{};return <><PageIntro title="Segurança" description="Políticas de sessão, cadastro, CAPTCHA e controles administrativos."/><SecurityAdminClient initial={security}/></>}
