"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" | "forgot" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Une erreur est survenue.");
      if (mode === "forgot") setMessage(result.message);
      else router.push(result.redirect ?? "/app");
    } catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { setLoading(false); }
  }
  return <form className="auth-form" onSubmit={submit}>
    {error && <div className="error-box" role="alert">{error}</div>}{message && <div className="success-box">{message}</div>}
    {mode === "register" && <div className="field"><label htmlFor="name">Nom complet</label><input id="name" name="name" autoComplete="name" required placeholder="Awa Diarra" /></div>}
    <div className="field"><label htmlFor="email">Adresse e-mail</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="vous@entreprise.com" /></div>
    {mode !== "forgot" && <div className="field"><label htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={10} placeholder="10 caractères minimum" /></div>}
    {mode === "register" && <label className="consent"><input type="checkbox" required /> <span>J’accepte les conditions d’utilisation et la politique de confidentialité.</span></label>}
    <button className="btn primary large" type="submit" disabled={loading}>{loading ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : mode === "register" ? "Créer mon espace" : "Envoyer le lien"}</button>
  </form>;
}
