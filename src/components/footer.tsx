import Link from "next/link";
import { Brand } from "./brand";

export function Footer() {
  return <footer className="footer"><div className="container footer-grid"><div><Brand /><p>La plateforme d’intelligence publicitaire qui relie vos clics à vos résultats.</p></div><div><strong>Produit</strong><Link href="/#produit">Fonctionnalités</Link><Link href="/#tarifs">Tarifs</Link><Link href="/connexion">Connexion</Link></div><div><strong>Ressources</strong><Link href="/aide">Centre d’aide</Link><Link href="/api/health">Statut API</Link><Link href="/confidentialite">Confidentialité</Link></div><div><strong>Entreprise</strong><a href="mailto:contact@getadpulse.tech">Nous contacter</a><span>Abidjan · Afrique</span></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} ADPulse. Tous droits réservés.</span><span>Construit pour les équipes qui veulent comprendre ce qui fonctionne.</span></div></footer>;
}
