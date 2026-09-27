"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { CreditCard } from "lucide-react";
import { detectLocaleCountry, detectPhoneCountry } from "@/lib/billing/countries";
import { localChargeAmount } from "@/lib/billing/fx";
import { money } from "@/lib/format";

/** The two offers exposed here; the adapter keeps the full documented gateway list internally. */
const gateways = [
  { value: "card", label: "Carte bancaire — Visa / Mastercard" },
  { value: "mobile", label: "Mobile Money — Afrique (14 pays)" },
] as const;

const POLL_INTERVAL_MS = 4000;
const POLL_ATTEMPTS = 45;

/** Browser locale read without a hydration mismatch: the server snapshot is empty, the client re-reads it. */
const localeSubscribe = () => () => {};
const localeSnapshot = () => window.navigator.language;
const localeServerSnapshot = () => "";

type Phase = "idle" | "pending" | "completed" | "failed";

interface Charge { currency: string; amount: number; rate: number | null }

export function PaymentPanel({ plan, provider, configured, rates }: {
  plan: { id: string; name: string; price: number; currency: string } | null;
  provider: string;
  configured: boolean;
  rates: Record<string, number>;
}) {
  const [gateway, setGateway] = useState<string>("card");
  const [phone, setPhone] = useState("");
  const locale = useSyncExternalStore(localeSubscribe, localeSnapshot, localeServerSnapshot);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reference, setReference] = useState("");
  const [charge, setCharge] = useState<Charge | null>(null);
  const needsPhone = gateway === "mobile";

  // Mobile Money never leaves the application: the outcome is read back from the server, which polls the
  // gateway status endpoint, and the same verified settlement path as the webhook applies it.
  useEffect(() => {
    if (phase !== "pending" || !reference) return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/billing/payments/${encodeURIComponent(reference)}/status`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Paiement illisible.");
        if (result.status === "completed") { setPhase("completed"); setNotice(result.message ?? "Paiement confirmé."); window.clearInterval(timer); }
        else if (result.status === "failed") { setPhase("failed"); setError(result.message ?? "Paiement refusé."); window.clearInterval(timer); }
        else if (attempts >= POLL_ATTEMPTS) { setPhase("idle"); setNotice("Paiement toujours en attente. Validez l’invite sur votre téléphone : le résultat s’affichera ici."); window.clearInterval(timer); }
      } catch (cause) {
        if (attempts >= POLL_ATTEMPTS) { setPhase("idle"); setError(cause instanceof Error ? cause.message : "Paiement illisible."); window.clearInterval(timer); }
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [phase, reference]);

  // Country and currency are never asked for: a dial code typed by the customer wins, the browser locale
  // pre-selects the country meanwhile. Both are read live, with no redirect and no extra step.
  const detected = (phone.trim() ? detectPhoneCountry(phone) : null) ?? detectLocaleCountry(locale);
  const local = plan && detected?.supported ? localChargeAmount(rates, detected.currency, plan.price) : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setPhase("idle"); setCharge(null); setLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan?.id, gateway, phone: needsPhone ? phone.trim() : undefined, locale: locale || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Paiement impossible.");
      setCharge(result.charge ?? null);
      if (result.redirectUrl) { window.location.assign(result.redirectUrl); return; }
      setReference(result.reference);
      if (result.status === "failed") { setPhase("failed"); setError(result.message ?? "Paiement refusé par l’opérateur."); return; }
      setPhase("pending");
      setNotice(result.message ?? `Paiement ${result.reference} initié.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paiement impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (!plan) return <article className="panel current-plan"><span className="icon-box"><CreditCard size={18} /></span><div><span>Moyen de paiement</span><h3>Aucune offre active</h3><p>Souscrivez une offre pour initier un paiement {provider}.</p></div></article>;

  return <article className="panel settings-panel">
    <div className="panel-head"><div><h3>Payer avec {provider}</h3><span>{plan.name} · {money(plan.price, plan.currency)}</span></div><CreditCard size={18} /></div>
    {!configured && <div className="error-box">La passerelle {provider} est activée mais ses identifiants ne sont pas encore configurés.</div>}
    {error && <div className="error-box" role="alert">{error}</div>}
    {notice && <div className="success-box">{notice}</div>}
    <form className="form-grid" onSubmit={submit}>
      <div className="field"><label>Moyen de paiement</label><select name="gateway" value={gateway} onChange={event => { setGateway(event.target.value); setError(""); setNotice(""); setPhase("idle"); }}>{gateways.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div>
      <div className="field"><label>Numéro Mobile Money (format international)</label><input name="phone" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+254712345678" disabled={!needsPhone} required={needsPhone} /><small>Le pays, la devise et le réseau sont déduits de l’indicatif.</small></div>
      <div className="field full"><small>Montant crédité au solde : <strong>{money(plan.price, plan.currency)}</strong>, toujours en {plan.currency}.{detected && <> Pays détecté : <strong>{detected.name}</strong> ({detected.dial}, {detected.currency}){detected.supported ? "" : " — Mobile Money indisponible, réglez par carte."}</>}{needsPhone && local && <> Débit Mobile Money : <strong>{local.amount} {local.currency}</strong> (1 {plan.currency} = {local.rate} {local.currency}).</>}</small></div>
      {phase === "pending" && <div className="field full"><small>Paiement {reference} en cours{charge && <> — débit de {charge.amount} {charge.currency}</>}. Validez l’invite sur votre téléphone : le résultat s’affichera ici, sans quitter cette page.</small></div>}
      <div className="field full"><button className="btn primary" disabled={loading || !configured || phase === "pending"}>{loading ? "Initialisation…" : phase === "pending" ? "En attente de confirmation…" : `Payer ${money(plan.price, plan.currency)}`}</button></div>
    </form>
  </article>;
}
