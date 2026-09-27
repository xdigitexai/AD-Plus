import { BillingProvider, DisabledBillingProvider } from "./provider";
import { XdigitexPayProvider } from "./xdigitex-pay";

/**
 * One payment provider for the whole application (there is no per-country provider setting in the schema).
 * Xdigitex Pay covers its 14 documented countries from a single account, deriving country and currency
 * from the customer phone number for mobile money.
 */
export function getBillingProvider(): BillingProvider {
  const configured = (process.env.PAYMENT_PROVIDER ?? "disabled").trim().toLowerCase();
  if (configured === "xdigitex-pay" || configured === "xdigitex_pay" || configured === "xdigitex") return new XdigitexPayProvider();
  return new DisabledBillingProvider();
}
