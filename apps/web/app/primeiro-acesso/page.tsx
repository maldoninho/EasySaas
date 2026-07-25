import Link from "next/link";

export const metadata = { title: "Primeiro acesso" };

const defaultEmail = "superadmin@local.easysaas";
const defaultPassword = "TrocarSenha!2026";

export default function Page() {
  const email = process.env.EASYSAAS_SUPERADMIN_EMAIL?.trim() || defaultEmail;
  const name = process.env.EASYSAAS_SUPERADMIN_NAME?.trim() || "Super Admin";
  const password = process.env.NODE_ENV === "production"
    ? "Definida em EASYSAAS_SUPERADMIN_PASSWORD"
    : process.env.EASYSAAS_SUPERADMIN_PASSWORD?.trim() || defaultPassword;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand-link auth-brand"><span className="brand-symbol">E</span><span>EasySaaS</span></Link>
        <div>
          <h1>Primeiro acesso</h1>
          <p>Use o superusuário criado automaticamente pelo seed local para entrar no painel.</p>
        </div>

        <div className="notice info">
          O bootstrap cria o banco, executa as migrations e aplica o seed. Em uma instalação local nova, este usuário já fica salvo no banco.
        </div>

        <div className="secret-box">
          <small>Nome</small>
          <code>{name}</code>
        </div>
        <div className="secret-box">
          <small>Usuário / e-mail</small>
          <code>{email}</code>
        </div>
        <div className="secret-box">
          <small>Senha</small>
          <code>{password}</code>
        </div>

        <div className="notice warning">
          Esta credencial padrão é para instalação local. Em produção, defina outra senha em <code>EASYSAAS_SUPERADMIN_PASSWORD</code> antes do seed.
        </div>

        <Link className="button button-primary button-full" href="/login">Ir para o login</Link>
        <div className="auth-footer"><Link href="/register">Criar conta</Link></div>
      </section>
    </main>
  );
}
