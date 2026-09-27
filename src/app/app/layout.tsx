import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { getWorkspaceForUser } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export default async function DashboardLayout({children}:{children:React.ReactNode}){
  const user=await requireUser();
  const {workspace}=await getWorkspaceForUser(user.id);
  const notifications=await db.notification.findMany({where:{workspaceId:workspace.id},orderBy:{createdAt:"desc"},take:5});
  return <AppShell
    user={{name:user.name,email:user.email}}
    workspace={workspace}
    isAdmin={user.systemRole==="ADMIN"}
    notifications={notifications.map(n=>({id:n.id,title:n.title,message:n.message,actionUrl:n.actionUrl,createdAt:n.createdAt.toLocaleDateString("fr-FR")}))}
  >{children}</AppShell>;
}
