import { redirect } from "next/navigation";
export const metadata = { title: "Redirecionando..." };
export default function Page() { redirect("/primeiro-acesso"); }
