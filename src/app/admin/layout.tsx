import{AppShell}from"@/components/app-shell";import{requireAdmin}from"@/lib/auth";import{db}from"@/lib/db";import{getWorkspaceForUser}from"@/lib/workspace";
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){
  const user=await requireAdmin();
  const{workspace}=await getWorkspaceForUser(user.id);
  const notifications=await db.notification.findMany({where:{workspaceId:workspace.id},orderBy:{createdAt:"desc"},take:5});
  return <AppShell
    user={{name:user.name,email:user.email}}
    workspace={workspace}
    isAdmin
    notifications={notifications.map(n=>({id:n.id,title:n.title,message:n.message,actionUrl:n.actionUrl,createdAt:n.createdAt.toLocaleDateString("fr-FR")}))}
  >{children}</AppShell>;
}
