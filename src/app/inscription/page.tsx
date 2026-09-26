import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Créer un compte" };
export default function RegisterPage(){return <AuthShell><h2>Créez votre espace ADPulse</h2><p>Commencez gratuitement. Aucune carte bancaire requise.</p><AuthForm mode="register"/><div className="auth-alt">Vous avez déjà un compte ? <Link href="/connexion">Se connecter</Link></div></AuthShell>}
