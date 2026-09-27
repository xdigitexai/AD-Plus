import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { assertSameOrigin, rateLimit } from "@/lib/security";
import { slugify } from "@/lib/format";
import { APP_CURRENCY } from "@/lib/currency";

const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.email().toLowerCase(), password: z.string().min(10).max(128) });
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!rateLimit(`register:${ip}`, 5, 15 * 60_000)) return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
    const input = schema.parse(await request.json());
    if (await db.user.findUnique({ where: { email: input.email } })) return NextResponse.json({ error: "Un compte utilise déjà cette adresse." }, { status: 409 });
    const baseSlug = slugify(input.name) || "workspace";
    const suffix = Math.random().toString(36).slice(2, 7);
    const user = await db.$transaction(async (tx) => {
      const plan = await tx.plan.upsert({ where: { slug: "free-trial" }, update: {}, create: { name: "Essai gratuit", slug: "free-trial", description: "Découvrir ADPulse", price: 0, currency: APP_CURRENCY, billingInterval: "MONTH", trialDays: 14, limits: { clicks: 1000, workspaces: 1 }, features: ["tracking", "analytics", "campaigns"], sortOrder: 0 } });
      const created = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) } });
      const workspace = await tx.workspace.create({ data: { name: `Espace de ${input.name}`, slug: `${baseSlug}-${suffix}`, members: { create: { userId: created.id, role: "OWNER" } } } });
      await tx.subscription.create({ data: { workspaceId: workspace.id, planId: plan.id, status: "TRIALING", trialEndsAt: new Date(Date.now() + 14 * 86_400_000) } });
      await tx.auditLog.create({ data: { actorId: created.id, workspaceId: workspace.id, action: "ACCOUNT_CREATED", entityType: "User", entityId: created.id } });
      return created;
    });
    await createSession(user.id);
    return NextResponse.json({ redirect: "/onboarding" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Vérifiez les informations saisies." }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_ORIGIN") return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
    console.error(error); return NextResponse.json({ error: "Impossible de créer le compte." }, { status: 500 });
  }
}
