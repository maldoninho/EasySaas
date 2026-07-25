"use client";
import Script from "next/script";
import { useState } from "react";

/** Real Cloudflare Turnstile widget */
export function TurnstileCaptcha({ siteKey }: { siteKey: string }) {
  return (
    <div className="captcha-box">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />
    </div>
  );
}

/**
 * Dev-mode simulated CAPTCHA.
 * Exibe um checkbox visual "Não sou robô" que simula a verificação.
 * O token gerado é "dev-captcha-pass" — o backend em dev auto-accepta.
 */
export function DevCaptcha({ onReady }: { onReady?: () => void }) {
  const [checked, setChecked] = useState(false);

  function handleChange() {
    setChecked(true);
    // Cria um campo hidden para o formulário ler como "cf-turnstile-response"
    const form = document.activeElement?.closest("form");
    if (form) {
      let hidden = form.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]');
      if (!hidden) {
        hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = "cf-turnstile-response";
        form.appendChild(hidden);
      }
      hidden.value = "dev-captcha-pass";
    }
    onReady?.();
  }

  return (
    <div className="captcha-box dev-captcha" onClick={handleChange} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleChange(); }}>
      <div className={`dev-captcha-checkbox ${checked ? "checked" : ""}`}>
        {checked ? "✓" : ""}
      </div>
      <div className="dev-captcha-content">
        <span className="dev-captcha-label">Não sou robô</span>
        <span className="dev-captcha-badge">DEV</span>
      </div>
    </div>
  );
}

/**
 * Componente CAPTCHA unificado.
 * Exibe o captcha real (Turnstile) quando há siteKey, ou o simulado em dev.
 */
export function Captcha({
  mode,
  siteKey,
}: {
  mode: string;
  siteKey?: string;
}) {
  if (mode === "off") return null;
  if (siteKey) return <TurnstileCaptcha siteKey={siteKey} />;
  return <DevCaptcha />;
}
