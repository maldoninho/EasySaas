import { AdminApplicationClient } from "@/components/admin-application-client";
import { PageIntro } from "@/components/page-state";
import { serverApi } from "@/lib/api";

type Category = { id: string; name: string; slug: string; description?: string; icon?: string; mode: string; sort_order: number; enabled: boolean; modules: Array<{ id: string; stableId: string; name: string; slug: string; status: string; visible: boolean; sortOrder: number }> };
export const metadata = { title: "Estrutura do aplicativo" };
export default async function ApplicationPage() {
  const categories = await serverApi<Category[]>("/api/v1/admin/categories");
  return <><PageIntro title="Estrutura do aplicativo" description="Crie categorias, altere posições e organize os módulos sem mover suas pastas físicas." /><AdminApplicationClient initial={categories} /></>;
}
