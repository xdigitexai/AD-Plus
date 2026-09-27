import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { getBillingProvider } from "@/lib/billing";
import { settlePayment } from "@/lib/billing/settle";

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await params;
  const provider = getBillingProvider();
  if (providerId !== provider.id) return NextResponse.json({ error: "Fournisseur inconnu." }, { status: 404 });

  const rawBody = await request.text();
  try {
    const event = await provider.verifyWebhook(rawBody);
    if (!event) return NextResponse.json({ error: "Événement de paiement non vérifié." }, { status: 400 });

    const result = await settlePayment({ providerId: provider.id, reference: event.reference, event, payload: JSON.parse(rawBody) as Prisma.InputJsonObject });
    if (!result.ok) {
      if (result.reason === "unknown_payment") return NextResponse.json({ error: "Paiement inconnu." }, { status: 404 });
      return NextResponse.json({ error: "Montant confirmé par la passerelle non conforme." }, { status: 409 });
    }
    if (result.duplicate) return NextResponse.json({ ok: true, duplicate: true });

    return NextResponse.json({ ok: true, status: event.status, credited: result.credited ?? false });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Traitement du webhook impossible." }, { status: 500 });
  }
}
