import type { Prisma } from "@generated/prisma/client";
import { db } from "@/lib/db";
import type { WebhookEvent } from "./provider";

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";

export interface SettlementInput {
  providerId: string;
  reference: string;
  /** Verified event: for a webhook it comes from verifyWebhook(), for a poll from the status endpoint. */
  event: WebhookEvent;
  payload: Prisma.InputJsonValue;
}

export interface SettlementResult {
  ok: boolean;
  credited?: boolean;
  duplicate?: boolean;
  reason?: "unknown_payment" | "amount_mismatch";
}

/**
 * Single settlement path, shared by the provider webhook and the in-app status poll of a Mobile Money
 * payment, so both apply exactly the same verification and idempotency rules.
 *
 * The amount the gateway confirms must match the amount this payment was initiated with: `chargeAmount`
 * and `chargeCurrency` in the payment metadata (local currency for Mobile Money, USD for card). The
 * workspace is then always credited `Payment.amount` in `Payment.currency`, which is USD — the gateway
 * figure is never used as the credit, so no implicit conversion happens on the way in.
 */
export async function settlePayment(input: SettlementInput): Promise<SettlementResult> {
  const payment = await db.payment.findUnique({ where: { providerReference: input.reference } });
  if (!payment || payment.provider !== input.providerId) return { ok: false, reason: "unknown_payment" };

  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
  const chargeCurrency = String(metadata.chargeCurrency ?? payment.currency).toUpperCase();
  const chargeAmount = Number(metadata.chargeAmount ?? payment.amount);
  if (input.event.currency.toUpperCase() !== chargeCurrency || Math.abs(input.event.amount - chargeAmount) > 0.01) {
    console.error(`Payment ${input.reference}: gateway confirmed ${input.event.amount} ${input.event.currency}, initiated for ${chargeAmount} ${chargeCurrency}`);
    await db.auditLog.create({ data: { workspaceId: payment.workspaceId, action: "PAYMENT_AMOUNT_MISMATCH", entityType: "Payment", entityId: payment.id } });
    return { ok: false, reason: "amount_mismatch" };
  }

  // Idempotency: the (provider, reference, event) ledger row is the lock, so a replayed webhook — or a
  // status poll racing the webhook — can never credit the same payment twice.
  try {
    await db.paymentEvent.create({ data: {
      paymentId: payment.id,
      provider: input.providerId,
      providerReference: input.reference,
      event: input.event.event,
      status: input.event.status,
      amount: input.event.amount,
      fee: input.event.fee ?? null,
      netAmount: input.event.netAmount ?? null,
      currency: input.event.currency,
      payload: input.payload,
    } });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: true, duplicate: true };
    throw error;
  }

  const providerFields = { providerStatus: input.event.status, fee: input.event.fee ?? null, netAmount: input.event.netAmount ?? null };

  if (input.event.status === "failed") {
    await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { ...providerFields, status: "FAILED" } });
    return { ok: true, credited: false };
  }

  const creditedAmount = Number(payment.amount);
  const creditedCurrency = payment.currency;

  const credited = await db.$transaction(async (tx) => {
    const settled = await tx.payment.updateMany({ where: { id: payment.id, status: { not: "SUCCEEDED" } }, data: { ...providerFields, status: "SUCCEEDED", paidAt: new Date() } });
    if (settled.count === 0) return false;

    const number = `AP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${input.reference.slice(-6)}`;
    await tx.invoice.upsert({
      where: { number },
      update: { status: "PAID" },
      create: { workspaceId: payment.workspaceId, paymentId: payment.id, number, amount: creditedAmount, currency: creditedCurrency, status: "PAID" },
    });

    const subscription = await tx.subscription.findFirst({ where: { workspaceId: payment.workspaceId }, include: { plan: true }, orderBy: { createdAt: "desc" } });
    if (subscription) {
      const days = subscription.plan.billingInterval === "YEAR" ? 365 : 30;
      await tx.subscription.update({ where: { id: subscription.id }, data: { status: "ACTIVE", provider: input.providerId, providerReference: input.reference, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + days * 86_400_000) } });
    }

    await tx.notification.create({ data: { workspaceId: payment.workspaceId, type: "BILLING", title: "Paiement confirmé", message: `Paiement ${input.reference} confirmé : ${creditedAmount} ${creditedCurrency} crédités.`, actionUrl: "/app/facturation" } });
    await tx.auditLog.create({ data: { workspaceId: payment.workspaceId, action: "PAYMENT_SUCCEEDED", entityType: "Payment", entityId: payment.id } });
    return true;
  });

  return { ok: true, credited };
}
