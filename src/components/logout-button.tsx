"use client";
import { LogOut } from "lucide-react"; import { useRouter } from "next/navigation";
export function LogoutButton(){const router=useRouter();async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.push("/connexion");router.refresh()}return <button className="side-logout" onClick={logout}><LogOut size={15}/> Déconnexion</button>}
