import Link from "next/link";
import { ArrowRight, BarChart3, CircleDollarSign, Gauge, HelpCircle, Link2, Megaphone } from "lucide-react";
import { Footer } from "@/components/footer";
import { PublicNav } from "@/components/public-nav";

export const metadata = { title: "Centre d’aide" };

const sections = [
  { href: "/app/campagnes/nouvelle", icon: Megaphone, title: "Créer une campagne", text: "Regroupez vos liens, votre budget et vos canaux dans une campagne mesurable." },
  { href: "/app/liens/nouveau", icon: Link2, title: "Créer un lien de tracking", text: "Construisez une URL courte avec ses paramètres UTM et ses règles de routage." },
  { href: "/app/analytics", icon: BarChart3, title: "Lire vos analyses", text: "Comparez sources, appareils et pays, puis suivez vos conversions." },
  { href: "/app/integrations", icon: Gauge, title: "Connecter une plateforme", text: "Reliez Meta Ads et les futurs fournisseurs publicitaires à votre espace." },
  { href: "/app/facturation", icon: CircleDollarSign, title: "Gérer la facturation", text: "Consultez votre offre, vos paiements et vos justificatifs." },
];

export default function Help() {
  return <><PublicNav /><main className="section"><div className="container">
    <div className="center-head"><span className="kicker">CENTRE D’AIDE</span><h2>Les raccourcis essentiels d’ADPulse.</h2><p>Chaque guide ouvre directement la page concernée dans votre espace de travail.</p></div>
    <div className="feature-grid">{sections.map(({ href, icon: Icon, title, text }) => <article className="feature-card" key={href}><span className="icon-box"><Icon size={23} /></span><h3>{title}</h3><p>{text}</p><Link href={href}>Ouvrir <ArrowRight size={16} /></Link></article>)}</div>
    <div className="info-banner"><HelpCircle size={18} /><div><strong>Besoin d’une réponse humaine ?</strong><p>Écrivez à <a href="mailto:contact@getadpulse.tech">contact@getadpulse.tech</a> en précisant l’espace et la page concernée.</p></div></div>
  </div></main><Footer /></>;
}
