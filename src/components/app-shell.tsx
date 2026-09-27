"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Bot, CircleDollarSign, Gauge, HelpCircle, LayoutDashboard, Link2, Megaphone, Menu, Settings, Shield } from "lucide-react";
import { Brand } from "./brand";
import { LogoutButton } from "./logout-button";

export type ShellNotification = { id: string; title: string; message: string; actionUrl: string | null; createdAt: string };

const nav = [
  ["/app", LayoutDashboard, "Vue d’ensemble"],
  ["/app/campagnes", Megaphone, "Campagnes"],
  ["/app/liens", Link2, "Liens de tracking"],
  ["/app/analytics", BarChart3, "Analytics"],
  ["/app/automatisations", Bot, "Automatisations"],
  ["/app/facturation", CircleDollarSign, "Facturation"],
] as const;

const config = [
  ["/app/integrations", Gauge, "Intégrations"],
  ["/app/parametres", Settings, "Paramètres"],
] as const;

export function AppShell({ user, workspace, isAdmin, notifications = [], children }: { user: { name: string; email: string }; workspace: { name: string }; isAdmin: boolean; notifications?: ShellNotification[]; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || (href !== "/app" && pathname.startsWith(`${href}/`));
  const closeMenu = () => setMenuOpen(false);

  return <div className="app-shell">
    {menuOpen && <button type="button" className="side-backdrop open" aria-label="Fermer le menu" onClick={closeMenu} />}
    <aside className={`sidebar${menuOpen ? " open" : ""}`}>
      <Brand />
      <div className="workspace-switch"><span>{workspace.name.slice(0, 1).toUpperCase()}</span><div><strong>{workspace.name}</strong><small>Espace de travail</small></div></div>
      <nav className="side-nav" onClick={closeMenu}>
        <span className="side-label">Pilotage</span>
        {nav.map(([href, Icon, label]) => <Link href={href} key={href} className={isCurrent(href) ? "active" : undefined}><Icon size={16} />{label}</Link>)}
        <span className="side-label">Configuration</span>
        {config.map(([href, Icon, label]) => <Link href={href} key={href} className={isCurrent(href) ? "active" : undefined}><Icon size={16} />{label}</Link>)}
        {isAdmin && <Link href="/admin" className={isCurrent("/admin") ? "active" : undefined}><Shield size={16} />Administration</Link>}
      </nav>
      <div className="side-bottom">
        <Link href="/aide" className="side-help"><HelpCircle size={15} /> Centre d’aide</Link>
        <LogoutButton />
        <div className="user-tile"><span className="avatar">{user.name.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="app-topbar">
        <button className="icon-btn mobile-menu" aria-label="Ouvrir le menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><Menu size={18} /></button>
        <h1>ADPulse</h1>
        <div className="app-tools">
          <div className="notif-wrap">
            <button className="icon-btn" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(open => !open)}><Bell size={16} />{notifications.length > 0 && <span className="notif-dot" />}</button>
            {notificationsOpen && <div className="notif-panel"><strong>Notifications</strong>{notifications.length === 0 ? <p className="notif-empty">Aucune notification pour le moment.</p> : notifications.map(item => item.actionUrl ? <Link href={item.actionUrl} key={item.id} onClick={() => setNotificationsOpen(false)}>{item.title}<small>{item.message} · {item.createdAt}</small></Link> : <div className="notif-item" key={item.id}>{item.title}<small>{item.message} · {item.createdAt}</small></div>)}</div>}
          </div>
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
        </div>
      </header>
      <main className="app-content">{children}</main>
    </div>
  </div>;
}
