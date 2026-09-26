import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { getWorkspaceForUser } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export default async function DashboardLayout({children}:{children:React.ReactNode}){const user=await requireUser();const {workspace}=await getWorkspaceForUser(user.id);return <AppShell user={user} workspace={workspace} isAdmin={user.systemRole==="ADMIN"}>{children}</AppShell>}
