import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { hashToken, rateLimit } from "@/lib/security";

const schema = z.object({
  type: z.enum(["PAGE_VIEW", "LEAD", "SIGNUP", "PURCHASE", "CUSTOM"]),
  customName: z.string().max(100).optional(), clickId: z.string().optional(), trackingLinkId: z.string().optional(), campaignId: z.string().optional(),
  value: z.number().nonnegative().optional(), currency: z.string().length(3).optional(), externalId: z.string().max(180).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!raw || !rateLimit(`conversion:${raw.slice(0, 12)}`, 120, 60_000)) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const apiKey = await db.workspaceApiKey.findFirst({ where: { keyHash: hashToken(raw), revokedAt: null } });
    if (!apiKey) return NextResponse.json({ error: "Clé API invalide." }, { status: 401 });
    const input = schema.parse(await req.json());
    const click = input.clickId ? await db.clickEvent.findFirst({ where: { id: input.clickId, workspaceId: apiKey.workspaceId } }) : null;
    const metadata = input.metadata as Prisma.InputJsonValue | undefined;
    const event = await db.conversionEvent.create({ data: { workspaceId: apiKey.workspaceId, type: input.type, customName: input.customName, clickEventId: click?.id, campaignId: click?.campaignId || input.campaignId, trackingLinkId: click?.trackingLinkId || input.trackingLinkId, value: input.value, currency: input.currency, externalId: input.externalId, metadata } });
    await db.workspaceApiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
    return NextResponse.json({ id: event.id, accepted: true }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Événement invalide.", details: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Impossible d’enregistrer la conversion." }, { status: 500 });
  }
}
