"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientApi, errorMessage } from "@/lib/client-api";
import { Captcha } from "@/components/captcha";

type Step = "welcome" | "activate" | "mfa" | "done";

interface CaptchaConfig {
  mode: string;
  provider: string;
  siteKey?: string;
  publicSignup?: boolean;
}

interface ValidateResponse {
  valid: boolean;
  token: string;
  user: { id: string; email: string; name: string };
}

interface ActivateResponse {
  activated: boolean;
  redirectTo: string;
}

interface MfaStartResponse {
  credentialId: string;
  secret: string;
  uri: string;
}

interface MfaConfirmResponse {
  enabled: boolean;
  recoveryCodes: string[];
}

function AuthCard({title,description,children,footer}:{title:string;description:string;children:React.ReactNode;footer?:React.ReactNode}){return <main className="auth-page"><section className="auth-card"><Link href="/" className="brand-link auth-brand"><span className="brand-symbol">E</span><span>EasySaaS</span></Link><div><h1>{title}</h1><p>{description}</p></div>{children}{footer&&<div className="auth-footer">{footer}</div>}</section></main>}

export function ActivationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [flowToken, setFlowToken] = useState<string>("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaConfig>({ mode: "off", provider: "off" });
  const [captchaVisible, setCaptchaVisible] = useState(false);

  // Step 1 fields
  const [activationToken, setActivationToken] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  // Step 2 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // MFA step
  const [mfaSetup, setMfaSetup] = useState<MfaStartResponse | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaConfirmed, setMfaConfirmed] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Load CAPTCHA config
  useEffect(() => {
    clientApi<CaptchaConfig>("/api/v1/public/captcha")
      .then((value) => {
        setCaptcha(value);
        if (value.mode === "always") setCaptchaVisible(true);
      })
      .catch(() => {});
  }, []);

  function getCaptchaToken(form: HTMLFormElement): string | undefined {
    const response = new FormData(form).get("cf-turnstile-response");
    return typeof response === "string" && response.length > 0 ? response : undefined;
  }

  async function handleValidate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = event.currentTarget as HTMLFormElement;

    try {
      const result = await clientApi<ValidateResponse>("/api/v1/setup/validate-temp", {
        method: "POST",
        body: JSON.stringify({
          activationToken,
          tempPassword,
          captchaToken: getCaptchaToken(form),
        }),
      });
      setFlowToken(result.token);
      setName(result.user.name);
      setEmail(result.user.email);
      setStep("activate");
    } catch (caught) {
      setError(errorMessage(caught));
      if (typeof caught === "object" && caught !== null && "code" in caught &&
          (caught as { code?: string }).code === "CAPTCHA_REQUIRED") {
        setCaptchaVisible(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não conferem.");
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError("Você precisa aceitar os termos de uso e a política de privacidade.");
      return;
    }

    setLoading(true);

    const form = event.currentTarget as HTMLFormElement;

    try {
      const result = await clientApi<ActivateResponse>("/api/v1/setup/complete-activation", {
        method: "POST",
        body: JSON.stringify({
          token: flowToken,
          name,
          email,
          newPassword,
          acceptedTerms,
          acceptedPrivacy,
          captchaToken: getCaptchaToken(form),
        }),
      });
      setSuccessMessage("Conta ativada com sucesso!");
      setStep("mfa");
    } catch (caught) {
      setError(errorMessage(caught));
      if (typeof caught === "object" && caught !== null && "code" in caught &&
          (caught as { code?: string }).code === "CAPTCHA_REQUIRED") {
        setCaptchaVisible(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStartMfa() {
    setError("");
    setLoading(true);
    try {
      const result = await clientApi<MfaStartResponse>("/api/v1/account/mfa/totp/start", {
        method: "POST",
      });
      setMfaSetup(result);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmMfa() {
    if (!mfaSetup) return;
    setError("");
    setLoading(true);
    try {
      const result = await clientApi<MfaConfirmResponse>("/api/v1/account/mfa/totp/confirm", {
        method: "POST",
        body: JSON.stringify({ credentialId: mfaSetup.credentialId, code: mfaCode }),
      });
      setMfaConfirmed(true);
      setRecoveryCodes(result.recoveryCodes);
      setSuccessMessage("Autenticação em duas etapas ativada!");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  function handleSkipMfa() {
    setStep("done");
    setTimeout(() => {
      router.replace("/admin");
      router.refresh();
    }, 1500);
  }

  function handleFinish() {
    window.location.href = "/admin";
  }

  // Step: done
  if (step === "done") {
    return (
      <AuthCard title="Configuração concluída" description="Sua conta está pronta para uso.">
        <div className="form-stack">
          <div className="notice success">{successMessage}</div>
          {recoveryCodes.length > 0 && (
            <div className="recovery-box">
              <p><strong>Códigos de recuperação</strong></p>
              <p className="muted-text">Guarde estes códigos em local seguro. Cada um só pode ser usado uma vez.</p>
              <div className="recovery-codes">
                {recoveryCodes.map((code, i) => (
                  <code key={i}>{code}</code>
                ))}
              </div>
            </div>
          )}
          <button className="button button-primary button-full" onClick={handleFinish}>
            Acessar painel administrativo
          </button>
        </div>
      </AuthCard>
    );
  }

  // Step: mfa — optional TOTP setup
  if (step === "mfa") {
    return (
      <AuthCard
        title="Proteja sua conta"
        description="Configure a autenticação em duas etapas para maior segurança. Você pode fazer isso agora ou depois no menu da sua conta."
      >
        <div className="form-stack">
          {successMessage && <div className="notice success">{successMessage}</div>}

          {!mfaSetup && !mfaConfirmed && (
            <>
              <div className="notice info">
                Recomendamos ativar a verificação em duas etapas usando um aplicativo autenticador
                (Google Authenticator, Authy, Microsoft Authenticator, etc.).
              </div>
              <div className="button-row">
                <button className="button button-primary" onClick={handleStartMfa} disabled={loading}>
                  {loading ? "Preparando..." : "Configurar autenticação em duas etapas"}
                </button>
                <button className="button button-secondary" onClick={handleSkipMfa}>
                  Pular (configurar depois)
                </button>
              </div>
            </>
          )}

          {mfaSetup && !mfaConfirmed && (
            <>
              <div className="secret-box">
                <small>Escaneie o QR code no seu aplicativo autenticador ou insira manualmente a chave abaixo:</small>
                <div className="mfa-qr-container">
                  {/* Render QR code as SVG inline */}
                  <QrCodeSvg uri={mfaSetup.uri} />
                </div>
                <code className="secret-key">{mfaSetup.secret}</code>
              </div>

              <label className="field">
                <span>Código de 6 dígitos</span>
                <input
                  name="mfaCode"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <button
                className="button button-primary button-full"
                onClick={handleConfirmMfa}
                disabled={loading || mfaCode.length !== 6}
              >
                {loading ? "Verificando..." : "Confirmar e ativar"}
              </button>
            </>
          )}

          {mfaConfirmed && (
            <>
              <div className="notice success">Autenticação em duas etapas ativada com sucesso!</div>

              <div className="recovery-box">
                <p><strong>Códigos de recuperação</strong></p>
                <p className="muted-text">Cada código só pode ser usado uma vez. Guarde-os em local seguro.</p>
                <div className="recovery-codes">
                  {recoveryCodes.map((code, i) => (
                    <code key={i}>{code}</code>
                  ))}
                </div>
              </div>

              <button className="button button-primary button-full" onClick={handleFinish}>
                Acessar painel administrativo
              </button>
            </>
          )}
        </div>
      </AuthCard>
    );
  }

  // Step: activate — enter real data
  if (step === "activate") {
    return (
      <AuthCard
        title="Ativar conta de administrador"
        description="Defina seus dados reais e uma senha definitiva para ativar o acesso."
      >
        <form onSubmit={handleActivate} className="form-stack">
          <label className="field">
            <span>Nome completo</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>

          <label className="field">
            <span>E-mail real</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Nova senha (mínimo 12 caracteres, maiúsculas, minúsculas e números)</span>
            <input
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>Confirmar nova senha</span>
            <input
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError("");
              }}
              required
              autoComplete="new-password"
            />
            {passwordError && <p className="field-error">{passwordError}</p>}
          </label>

          <label className="field-checkbox">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
            />
            <span>Aceito os <a href="/terms" target="_blank">termos de uso</a></span>
          </label>

          <label className="field-checkbox">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              required
            />
            <span>Aceito a <a href="/privacy" target="_blank">política de privacidade</a></span>
          </label>

          {captchaVisible && <Captcha mode={captcha.mode} siteKey={captcha.siteKey} />}

          {error && <p className="form-error">{error}</p>}

          <button className="button button-primary button-full" disabled={loading}>
            {loading ? "Ativando..." : "Ativar conta e continuar"}
          </button>
        </form>
      </AuthCard>
    );
  }

  // Step: welcome — enter temp credentials
  return (
    <AuthCard
      title="Primeiro acesso"
      description="Use as credenciais temporárias geradas durante a instalação para ativar sua conta de administrador."
    >
      <div className="notice info">
        As credenciais temporárias foram exibidas no terminal durante a execução do bootstrap.
        Se você perdeu o acesso, execute o comando de recuperação de administrador no servidor.
      </div>

      <form onSubmit={handleValidate} className="form-stack">
        <label className="field">
          <span>Token de ativação</span>
          <input
            name="activationToken"
            value={activationToken}
            onChange={(e) => setActivationToken(e.target.value)}
            required
            placeholder="Cole o token de ativação exibido no terminal"
          />
        </label>

        <label className="field">
          <span>Senha temporária</span>
          <input
            name="tempPassword"
            type="password"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            required
            autoComplete="off"
          />
        </label>

        {captchaVisible && <Captcha mode={captcha.mode} siteKey={captcha.siteKey} />}

        {error && <p className="form-error">{error}</p>}

        <button className="button button-primary button-full" disabled={loading}>
          {loading ? "Validando..." : "Validar credenciais"}
        </button>
      </form>
    </AuthCard>
  );
}

/** Simple inline QR Code SVG renderer from otpauth URI */
function QrCodeSvg({ uri }: { uri: string }) {
  // Use a simple approach: render the otpauth URI text for manual entry,
  // and display a QR code image via Google Charts API (offline-friendly fallback)
  const encodedUri = encodeURIComponent(uri);
  return (
    <div className="mfa-qr">
      <img
        src={`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodedUri}`}
        alt="QR Code para configurar autenticador"
        width={200}
        height={200}
        className="mfa-qr-img"
      />
    </div>
  );
}
