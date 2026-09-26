import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Connexion" };
export default function LoginPage(){return <AuthShell><h2>Bon retour parmi nous</h2><p>Connectez-vous pour retrouver vos campagnes.</p><AuthForm mode="login"/><div className="auth-alt"><Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link><br/><br/>Pas encore de compte ? <Link href="/inscription">Créer un espace</Link></div></AuthShell>}
