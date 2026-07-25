import { redirect } from "next/navigation";
import { PublicLanding } from "@/components/public-landing";
import { serverApi } from "@/lib/api";
export default async function HomePage(){const landing=await serverApi<{enabled:boolean;company?:{company_name?:string};sections:Array<{id:string;type:string;name:string;content:Record<string,unknown>}>;modules:Array<{stable_id:string;visual_name:string;description:string;icon?:string}>}>("/api/v1/public/landing");if(!landing.enabled)redirect("/login");return <PublicLanding landing={landing}/>}
