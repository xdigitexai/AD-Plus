import { db } from "./db";

export async function getWorkspaceForUser(userId: string) {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) throw new Error("WORKSPACE_REQUIRED");
  return { workspace: membership.workspace, role: membership.role };
}

export async function assertWorkspaceAccess(userId: string, workspaceId: string, allowed = ["OWNER", "ADMIN", "ANALYST", "MEMBER"]) {
  const membership = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
  if (!membership || !allowed.includes(membership.role)) throw new Error("FORBIDDEN");
  return membership;
}
