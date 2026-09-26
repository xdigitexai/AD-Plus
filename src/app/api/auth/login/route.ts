import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, rateLimit } from "@/lib/security";

const schema = z.object({ email: z.email().toLowerCase(), password: z.string().min(1).max(128) });
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!rateLimit(`login:${ip}`, 10, 15 * 60_000)) return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
    const input = schema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (!user || !await verifyPassword(input.password, user.passwordHash)) return NextResponse.json({ error: "Adresse e-mail ou mot de passe incorrect." }, { status: 401 });
    await createSession(user.id);
    return NextResponse.json({ redirect: user.onboardingCompletedAt ? "/app" : "/onboarding" });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    return NextResponse.json({ error: "Connexion impossible." }, { status: 500 });
  }
}
