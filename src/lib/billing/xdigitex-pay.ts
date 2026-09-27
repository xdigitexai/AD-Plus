import { z } from "zod";
import { BillingProvider, CheckoutRequest, CheckoutResult, PaymentProviderNotConfiguredError, ProviderStatus, WebhookEvent } from "./provider";

const DEFAULT_BASE_URL = "https://pay.xdigitex.space/api";

export { XDIGITEX_PAY_COUNTRIES, findSupportedCountry } from "./countries";

/**
 * The API answers with numbers on `/payments/initiate` but with decimal strings on
 * `/payments/{reference}/status`, so every numeric field is coerced before use.
 */
const initiateSchema = z.object({
  reference: z.string().min(1),
  gateway: z.string().optional(),
  amount: z.coerce.number().optional(),
  fee: z.coerce.number().optional(),
  net_amount: z.coerce.number().optional(),
  fee_percent: z.coerce.number().optional(),
  currency: z.string().optional(),
  redirect_url: z.string().optional(),
  checkout_url: z.string().optional(),
  qrcode_link: z.string().optional(),
  deposit_id: z.string().optional(),
  pawa_status: z.string().optional(),
  order_tracking_id: z.string().optional(),
  correspondent: z.string().optional(),
  message: z.string().optional(),
});

const statusSchema = z.object({
  reference: z.string().min(1),
  status: z.string().min(1),
  amount: z.coerce.number(),
  fee: z.coerce.number().optional(),
  net_amount: z.coerce.number().optional(),
  currency: z.string().optional(),
  gateway: z.string().optional(),
});

const webhookSchema = z.object({
  event: z.string().min(1),
  reference: z.string().min(1),
  status: z.string().min(1),
  amount: z.coerce.number(),
  fee: z.coerce.number().optional(),
  net_amount: z.coerce.number().optional(),
  currency: z.string().min(3),
});

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Statuses the mobile-money corridor (pawaPay) reports before the deposit reaches a terminal state. */
const PAWA_COMPLETED = new Set(["COMPLETED", "SUCCESSFUL"]);
const PAWA_FAILED = new Set(["FAILED", "REJECTED", "CANCELLED"]);

function normaliseStatus(raw: string | undefined) {
  const value = (raw ?? "").toUpperCase();
  if (PAWA_COMPLETED.has(value)) return "completed";
  if (PAWA_FAILED.has(value)) return "failed";
  return "pending";
}

export class XdigitexPayProvider implements BillingProvider {
  readonly id = "xdigitex-pay";
  readonly name = "Xdigitex Pay";

  isConfigured() { return Boolean(process.env.XDIGITEX_PAY_API_KEY?.trim()); }

  private get apiKey() {
    const key = process.env.XDIGITEX_PAY_API_KEY?.trim();
    if (!key) throw new PaymentProviderNotConfiguredError(this.name);
    return key;
  }

  private get baseUrl() { return (process.env.XDIGITEX_PAY_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""); }

  private get webhookUrl() { return process.env.XDIGITEX_PAY_WEBHOOK_URL?.trim() || `${appUrl()}/api/webhooks/billing/${this.id}`; }

  private async call<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      headers: { "X-API-Key": this.apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Xdigitex Pay ${path} responded ${response.status}`);
    if (payload && typeof payload === "object" && (payload as { success?: boolean }).success === false) throw new Error(`Xdigitex Pay ${path} rejected the request`);
    return payload as T;
  }

  async createCheckout(input: CheckoutRequest): Promise<CheckoutResult> {
    const [firstName, ...rest] = (input.customerName ?? "").trim().split(/\s+/).filter(Boolean);
    const body: Record<string, unknown> = {
      amount: input.amount,
      currency: input.currency,
      gateway: input.gateway,
      email: input.customerEmail,
      description: input.description,
      callback_url: input.successUrl,
      webhook_url: this.webhookUrl,
    };
    if (firstName) body.first_name = firstName;
    if (rest.length) body.last_name = rest.join(" ");
    if (input.phone) body.phone = input.phone;

    const created = initiateSchema.parse(await this.call<unknown>("/payments/initiate", body));
    return {
      providerReference: created.reference,
      gateway: created.gateway ?? input.gateway,
      status: normaliseStatus(created.pawa_status),
      /**
       * Only the hosted card checkout (`redirect_url`) may take the browser off the app.
       * Mobile Money answers with a provider-side polling page (`checkout_url`) instead, which is kept as
       * metadata only: the customer stays on the app and the server polls `/payments/{reference}/status`.
       */
      redirectUrl: created.redirect_url,
      message: created.message,
      fee: created.fee,
      netAmount: created.net_amount,
      metadata: {
        depositId: created.deposit_id ?? null,
        pawaStatus: created.pawa_status ?? null,
        correspondent: created.correspondent ?? null,
        feePercent: created.fee_percent ?? null,
        checkoutUrl: created.checkout_url ?? null,
        orderTrackingId: created.order_tracking_id ?? null,
      },
    };
  }

  async getPaymentStatus(reference: string): Promise<ProviderStatus> {
    const status = statusSchema.parse(await this.call<unknown>(`/payments/${encodeURIComponent(reference)}/status`));
    return { ...status, status: normaliseStatus(status.status) };
  }

  /**
   * The API documentation defines no webhook signature, so the callback body is treated as a hint only:
   * the authoritative status, amount and currency are read back from GET /payments/{reference}/status
   * with the account API key before anything is credited.
   */
  async verifyWebhook(rawBody: string): Promise<WebhookEvent | null> {
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const claimed = webhookSchema.safeParse(parsedBody);
    if (!claimed.success) return null;
    if (claimed.data.event !== "payment.completed" && claimed.data.event !== "payment.failed") return null;

    const remote = await this.getPaymentStatus(claimed.data.reference);
    if (remote.status !== normaliseStatus(claimed.data.status)) return null;
    if (remote.status !== "completed" && remote.status !== "failed") return null;
    if (Math.abs(remote.amount - claimed.data.amount) > 0.01) return null;

    return {
      event: remote.status === "completed" ? "payment.completed" : "payment.failed",
      reference: remote.reference,
      status: remote.status,
      amount: remote.amount,
      fee: remote.fee ?? claimed.data.fee,
      netAmount: remote.netAmount ?? claimed.data.net_amount,
      currency: remote.currency ?? claimed.data.currency,
    };
  }

  async refund(): Promise<void> {
    throw new Error("Xdigitex Pay documents no refund endpoint");
  }
}
