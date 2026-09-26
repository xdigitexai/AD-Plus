import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Mot de passe oublié" };
export default function ForgotPage(){return <AuthShell><h2>Réinitialisez votre mot de passe</h2><p>Nous préparerons un lien sécurisé si cette adresse est enregistrée.</p><AuthForm mode="forgot"/><div className="auth-alt"><Link href="/connexion">Revenir à la connexion</Link></div></AuthShell>}
