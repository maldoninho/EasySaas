import { notFound } from "next/navigation";
import { ModuleDetailClient } from "@/components/module-detail-client";
import { PageIntro } from "@/components/page-state";
import { serverApi } from "@/lib/api";

type Category = { id: string; name: string };
type ModuleData = {
  id: string; stable_id: string; visual_name: string; slug: string; description: string; function_summary?: string;
  icon?: string; category_id?: string; sort_order: number; status: string; visible: boolean; active_version_id?: string;
};
type Version = { id: string; version: string; validation_status: string; installed_at: string; activated_at?: string; validation_report?: unknown };
type Detail = { module: ModuleData; versions: Version[]; validations: unknown[] };

export default async function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detail: Detail;
  try { detail = await serverApi<Detail>(`/api/v1/admin/modules/${id}`); } catch (error) {
    if (error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 404) notFound();
    throw error;
  }
  const rawCategories = await serverApi<Array<{ id: string; name: string } & Record<string, unknown>>>("/api/v1/admin/categories");
  return <><PageIntro title={detail.module.visual_name} description={`Identidade técnica: ${detail.module.stable_id}`} /><ModuleDetailClient module={detail.module} versions={detail.versions} categories={rawCategories.map(({ id: categoryId, name }) => ({ id: categoryId, name }))} /></>;
}
