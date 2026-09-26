import Link from "next/link";
import { BarChart3, CheckCircle2, Link2 } from "lucide-react";
import { Brand } from "./brand";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><aside className="auth-side"><Brand /><div className="auth-message"><h1>Chaque campagne mérite une lecture claire.</h1><p>Centralisez vos liens, vos conversions et vos coûts pour prendre de meilleures décisions publicitaires.</p><div className="auth-points"><span><BarChart3 size={19}/> Indicateurs publicitaires unifiés</span><span><Link2 size={19}/> Liens courts et routage intelligent</span><span><CheckCircle2 size={19}/> Attribution et alertes de performance</span></div></div><span className="auth-foot">© {new Date().getFullYear()} ADPulse · getadpulse.tech</span></aside><section className="auth-form-side"><div className="auth-box"><Link className="auth-back" href="/">← Retour au site</Link>{children}</div></section></main>;
}
