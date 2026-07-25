import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth-forms";
export const metadata={title:"Confirmar e-mail"};
export default function VerifyEmailPage(){return <Suspense fallback={<main className="auth-page">Carregando...</main>}><VerifyEmailForm/></Suspense>}
