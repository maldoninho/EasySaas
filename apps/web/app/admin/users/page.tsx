import { AdminUsersClient } from "@/components/admin-users-client";
import { PageIntro } from "@/components/page-state";
import { serverApi } from "@/lib/api";

type Permission = { id: string; key: string; description: string };
type Role = { id: string; key: string; name: string; is_owner: boolean; is_system?: boolean; permissions?: string[] };
type User = { id: string; email: string; name: string; status: string; created_at: string; last_login_at?: string; roles: Role[] };
export const metadata = { title: "Usuários e acesso" };
export default async function UsersPage() {
  const [users, roles, permissions] = await Promise.all([serverApi<User[]>("/api/v1/admin/users"), serverApi<Role[]>("/api/v1/admin/roles"), serverApi<Permission[]>("/api/v1/admin/permissions")]);
  return <><PageIntro title="Usuários e acesso" description="Convites, estados de conta, papéis, sessões e proteção do último proprietário." /><AdminUsersClient initialUsers={users} roles={roles} permissions={permissions} /></>;
}
