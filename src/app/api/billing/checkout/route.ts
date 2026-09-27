import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@generated/prisma/client";
import { z } from "zod";
import { getBillingProvider } from "@/lib/billing";
import { detectLocaleCountry, detectPhoneCountry, phoneDigits } from "@/lib/billing/countries";
import { chargeRates, localChargeAmount } from "@/lib/billing/fx";
import { PaymentProviderNotConfiguredError } from "@/lib/billing/provider";
import { APP_CURRENCY } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";
import { getWorkspaceForUser } from "@/lib/workspace";

const schema = z.object({
  planId: z.string().min(1),
  /** The interface exposes these two only; the adapter keeps every documented gateway value internally. */
  gateway: z.enum(["card", "mobile"]).default("card"),
  phone: z.string().trim().max(24).optional(),
  /** navigator.language, used only as a pre-selection when the customer has not typed a phone yet. */
  locale: z.string().trim().max(35).optional(),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const { workspace, role } = await getWorkspaceForUser(user.id);
    if (!["OWNER", "ADMIN"].includes(role)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

    const input = schema.parse(await request.json());
    const plan = await db.plan.findFirst({ where: { id: input.planId, isActive: true } });
    if (!plan) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });

    const price = Number(plan.price);
    const currency = plan.currency || APP_CURRENCY;
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Cette offre ne nécessite aucun paiement." }, { status: 400 });

    // The customer is never asked for a country or a currency: a typed dial code wins, the browser locale
    // pre-selects the country otherwise, and both are resolved here without a redirect or an extra step.
    const phone = input.phone?.trim() || undefined;
    const detected = (phone ? detectPhoneCountry(phone) : null) ?? detectLocaleCountry(input.locale);
    if (phone && phoneDigits(phone).length < 10) return NextResponse.json({ error: "Numéro incomplet : utilisez le format international, par exemple +254712345678." }, { status: 400 });

    // Card is charged in the plan currency. Mobile Money is charged in the corridor's local currency and
    // the USD price is credited to the wallet, so the conversion is applied on the way out only.
    let charge = { currency, amount: price, rate: undefined as number | undefined };
    if (input.gateway === "mobile") {
      if (!phone) return NextResponse.json({ error: "Un numéro de téléphone est requis pour Mobile Money." }, { status: 400 });
      if (!detected) return NextResponse.json({ error: "Indicatif non reconnu : utilisez le format international, par exemple +254712345678." }, { status: 400 });
      if (!detected.supported) return NextResponse.json({ error: `Mobile Money n’est pas disponible pour ${detected.name} (${detected.dial}). Réglez par carte bancaire.` }, { status: 400 });
      const local = localChargeAmount(chargeRates(), detected.currency, price);
      if (!local) return NextResponse.json({ error: `Aucun taux de conversion n’est configuré pour ${detected.currency}. Réglez par carte bancaire.` }, { status: 400 });
      charge = local;
    }

    const provider = getBillingProvider();
    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    const result = await provider.createCheckout({
      workspaceId: workspace.id,
      planId: plan.id,
      amount: charge.amount,
      currency: charge.currency,
      description: `ADPulse — ${plan.name}`,
      customerEmail: user.email,
      customerName: user.name,
      phone,
      gateway: input.gateway,
      successUrl: `${appUrl}/app/facturation?paiement=retour`,
      cancelUrl: `${appUrl}/app/facturation?paiement=annule`,
    });
    const rejected = result.status === "failed";

    const payment = await db.payment.create({ data: {
      workspaceId: workspace.id,
      provider: provider.id,
      providerReference: result.providerReference,
      // Wallet credit, always in USD: settlement credits this figure, not the gateway-reported amount.
      amount: price,
      currency,
      status: rejected ? "FAILED" : "PENDING",
      method: input.gateway,
      gateway: result.gateway,
      providerStatus: result.status,
      fee: result.fee ?? null,
      netAmount: result.netAmount ?? null,
      phone: phone ?? null,
      // Only card may leave the app; Mobile Money never gets a URL to navigate to.
      redirectUrl: input.gateway === "card" ? result.redirectUrl ?? null : null,
      metadata: {
        planId: plan.id,
        country: detected?.code ?? null,
        countryName: detected?.name ?? null,
        countrySupported: detected?.supported ?? null,
        chargeCurrency: charge.currency,
        chargeAmount: charge.amount,
        chargeRate: charge.rate ?? null,
        depositId: result.metadata?.depositId ?? null,
        pawaStatus: result.metadata?.pawaStatus ?? null,
        correspondent: result.metadata?.correspondent ?? null,
        feePercent: result.metadata?.feePercent ?? null,
        checkoutUrl: result.metadata?.checkoutUrl ?? null,
      } as Prisma.InputJsonObject,
    } });
    await db.auditLog.create({ data: { workspaceId: workspace.id, actorId: user.id, action: "PAYMENT_INITIATED", entityType: "Payment", entityId: payment.id } });

    return NextResponse.json({
      id: payment.id,
      reference: result.providerReference,
      gateway: result.gateway,
      status: result.status,
      // Card: hosted checkout page. Mobile Money: null, the customer stays on the app and the status is polled.
      redirectUrl: payment.redirectUrl,
      charge: { currency: charge.currency, amount: charge.amount, rate: charge.rate ?? null },
      wallet: { currency, amount: price },
      country: detected ? { code: detected.code, name: detected.name, dial: detected.dial, currency: detected.currency, supported: detected.supported } : null,
      // A rejected deposit comes back with the provider's generic "prompt sent" text, so the rejection wins.
      message: rejected ? "Le paiement a été rejeté par l’opérateur Mobile Money." : result.message ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Demande de paiement invalide." }, { status: 400 });
    if (error instanceof PaymentProviderNotConfiguredError) return NextResponse.json({ error: "Aucune passerelle de paiement n’est configurée." }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: "Initialisation du paiement impossible." }, { status: 502 });
  }
}
