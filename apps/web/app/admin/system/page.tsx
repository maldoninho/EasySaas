import { PageIntro } from "@/components/page-state";
import { SystemAdminClient } from "@/components/system-admin-client";
import { serverApi } from "@/lib/api";
type SystemData={runtime:{node:string;environment:string;appUrl:string;smtpMode:string;storageDriver:string}};
type Health={database:string;failedJobs24h:number;timestamp:string};
type Job={id:string;type:string;status:string;attempts:number;max_attempts:number;last_error?:string;created_at:string};
export const metadata={title:"Sistema"};
export default async function SystemPage(){const [system,health,jobs]=await Promise.all([serverApi<SystemData>("/api/v1/admin/system"),serverApi<Health>("/api/v1/admin/system/health"),serverApi<Job[]>("/api/v1/admin/jobs")]);return <><PageIntro title="Sistema" description="Saúde, provedores, jobs, backups e operação da instalação."/><SystemAdminClient runtime={system.runtime} health={health} jobs={jobs}/></>}
