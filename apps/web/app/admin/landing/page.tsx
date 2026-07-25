import { LandingAdminClient } from "@/components/landing-admin-client";
import { PageIntro } from "@/components/page-state";
import { serverApi } from "@/lib/api";
type Landing={page:{enabled:boolean;status:string;seo:Record<string,unknown>};sections:Array<{id:string;type:string;name:string;enabled:boolean;sort_order:number;content:Record<string,unknown>}>};
export const metadata={title:"Landing Page"};
export default async function LandingPage(){const landing=await serverApi<Landing>("/api/v1/admin/landing");return <><PageIntro title="Landing Page" description="Edite o site público por blocos estruturados, visualize, publique e restaure versões."/><LandingAdminClient initial={landing}/></>}
