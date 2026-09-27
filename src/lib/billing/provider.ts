/** Gateways documented by Xdigitex Pay (POST /payments/initiate, `gateway` field). */
export type PaymentGateway = "card" | "safaricom" | "airtel" | "mobile" | "crypto";

/** The two gateways the interface exposes: card is a hosted redirect, mobile money settles inline. */
export type PublicGateway = Extract<PaymentGateway, "card" | "mobile">;

export interface CheckoutRequest {
  workspaceId: string;
  planId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName?: string;
  phone?: string;
  gateway: PaymentGateway;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  providerReference: string;
  gateway: string;
  status: string;
  redirectUrl?: string;
  qrcodeUrl?: string;
  message?: string;
  fee?: number;
  netAmount?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

/** Normalised webhook payload after server-side verification. */
export interface WebhookEvent {
  event: string;
  reference: string;
  status: string;
  amount: number;
  fee?: number;
  netAmount?: number;
  currency: string;
}

/** Normalised `GET /payments/{reference}/status` answer. */
export interface ProviderStatus {
  reference: string;
  status: string;
  amount: number;
  fee?: number;
  netAmount?: number;
  currency?: string;
  gateway?: string;
}

export interface BillingProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  createCheckout(input: CheckoutRequest): Promise<CheckoutResult>;
  /** Authoritative provider-side status, read back with the account API key. */
  getPaymentStatus(reference: string): Promise<ProviderStatus>;
  /**
   * Verifies a provider callback against the provider API and returns the trusted event.
   * A browser redirect is never trusted on its own.
   */
  verifyWebhook(rawBody: string): Promise<WebhookEvent | null>;
  refund(providerReference: string, amount?: number): Promise<void>;
}

export class PaymentProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured`);
    this.name = "PaymentProviderNotConfiguredError";
  }
}

export class DisabledBillingProvider implements BillingProvider {
  readonly id = "disabled";
  readonly name = "Aucune passerelle";
  isConfigured() { return false; }
  async createCheckout(): Promise<CheckoutResult> { throw new Error("Aucune passerelle de paiement n’est configurée"); }
  async getPaymentStatus(): Promise<ProviderStatus> { throw new Error("Aucune passerelle de paiement n’est configurée"); }
  async verifyWebhook(): Promise<WebhookEvent | null> { return null; }
  async refund(): Promise<void> { throw new Error("Aucune passerelle de paiement n’est configurée"); }
}
