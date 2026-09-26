import Link from "next/link";
import { Brand } from "./brand";

export function PublicNav() {
  return <header className="public-header"><div className="container nav-inner"><Brand /><nav className="nav-links" aria-label="Navigation principale"><Link href="/#produit">Produit</Link><Link href="/#solutions">Solutions</Link><Link href="/#tarifs">Tarifs</Link><Link href="/#faq">FAQ</Link></nav><div className="nav-actions"><Link className="btn ghost" href="/connexion">Connexion</Link><Link className="btn primary small" href="/inscription">Essai gratuit</Link></div></div></header>;
}
