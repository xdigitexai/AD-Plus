import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "ADPulse — Pilotez la performance publicitaire", template: "%s | ADPulse" },
  description: "Tracking, attribution et automatisation publicitaire pour transformer chaque clic en décision.",
  metadataBase: new URL(process.env.APP_URL ?? "https://getadpulse.tech"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body className={`${inter.variable} ${manrope.variable}`}>{children}</body></html>;
}
