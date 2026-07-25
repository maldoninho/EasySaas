import { ApplicationShell } from "@/components/shell";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ApplicationShell admin>{children}</ApplicationShell>;
}
