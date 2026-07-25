"use client";
import Script from "next/script";
export function Captcha({siteKey}:{siteKey:string}){return <div className="captcha-box"><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload"/><div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto"/></div>}
