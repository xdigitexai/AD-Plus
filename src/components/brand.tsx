import Link from "next/link";
import { Activity } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="ADPulse, accueil"><span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>{!compact && <span>AD<span>Pulse</span></span>}</Link>;
}
