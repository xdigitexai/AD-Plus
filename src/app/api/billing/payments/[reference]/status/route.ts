import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { getBillingProvider } from "@/lib/billing";
import { settlePayment } from "@/lib/billing/settle";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";
import { getWorkspaceForUser } from "@/lib/workspace";

const PENDING_MESSAGE = "Paiement en attente : validez l’invite reçue sur votre téléphone.";
const MISMATCH_MESSAGE = "Le montant confirmé par la passerelle ne correspond pas au paiement : rien n’a été crédité.";

/**
 * Mobile Money settles without leaving the application: the browser polls this route, the server reads
 * `GET /payments/{reference}/status` with the account API key and applies the outcome through the same
 * verified settlement path as the webhook. The response is always JSON — never a redirect.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const { workspace } = await getWorkspaceForUser(user.id);
    const { reference } = await params;

    const payment = await db.payment.findUnique({ where: { providerReference: decodeURIComponent(reference) } });
    if (!payment?.providerReference || payment.workspaceId !== workspace.id) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });

    const provider = getBillingProvider();
    if (payment.provider !== provider.id) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });

    const metadata = (payment.metadata ?? {}) as Record<string, unknown>;

    // Already credited: the credit is never replayed, and a later gateway verdict cannot take it back.
    if (payment.status === "SUCCEEDED") return NextResponse.json({
      reference: payment.providerReference,
      status: "completed",
      charge: { currency: metadata.chargeCurrency ?? payment.currency, amount: Number(metadata.chargeAmount ?? payment.amount) },
      wallet: { currency: payment.currency, amount: Number(payment.amount) },
      settled: true,
      credited: false,
      message: `Paiement déjà crédité : ${Number(payment.amount)} ${payment.currency}.`,
    });

    const remote = await provider.getPaymentStatus(payment.providerReference);
    const chargeCurrency = remote.currency ?? metadata.chargeCurrency ?? payment.currency;
    const response = {
      reference: payment.providerReference,
      status: remote.status,
      charge: { currency: chargeCurrency, amount: remote.amount },
      wallet: { currency: payment.currency, amount: Number(payment.amount) },
      settled: false,
      credited: false,
      message: remote.status === "pending" ? PENDING_MESSAGE : null,
    };

    if (remote.status !== "completed" && remote.status !== "failed") return NextResponse.json(response);

    const result = await settlePayment({
      providerId: provider.id,
      reference: payment.providerReference,
      event: {
        event: remote.status === "completed" ? "payment.completed" : "payment.failed",
        reference: remote.reference,
        status: remote.status,
        amount: remote.amount,
        fee: remote.fee,
        netAmount: remote.netAmount,
        currency: String(chargeCurrency),
      },
      payload: { ...remote } as Prisma.InputJsonObject,
    });

    return NextResponse.json({
      ...response,
      settled: result.ok,
      credited: result.credited ?? false,
      message: result.ok
        ? remote.status === "completed" ? `${Number(payment.amount)} ${payment.currency} crédités.` : "Paiement refusé par l’opérateur Mobile Money."
        : MISMATCH_MESSAGE,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lecture du paiement impossible." }, { status: 502 });
  }
}
