/**
 * Xdigitex Pay debits Mobile Money in the corridor's local currency (the documentation lists one currency
 * per country), while the AD-Pulse wallet is always credited in USD. The conversion therefore happens on
 * the way out only: `localChargeAmount` turns the USD plan price into the amount the gateway debits, and
 * settlement credits the USD price recorded on the `Payment` row — never the gateway-reported amount.
 *
 * The API documentation publishes no exchange rate, so the table is configuration, not a guess:
 * `XDIGITEX_PAY_RATES="KES=130,CDF=2350,..."`. The defaults are the rates already configured for the
 * same corridors in the Nova Host platform app on this host.
 */
export const DEFAULT_CHARGE_RATES: Readonly<Record<string, number>> = {
  KES: 130,
  CDF: 2350,
  UGX: 3800,
  XOF: 620,
  XAF: 620,
  RWF: 1300,
  ZMW: 25,
  SLE: 22,
  USD: 1,
};

export interface LocalCharge {
  currency: string;
  amount: number;
  rate: number;
}

export function parseChargeRates(value: string | undefined | null, defaults: Readonly<Record<string, number>> = DEFAULT_CHARGE_RATES): Record<string, number> {
  const rates: Record<string, number> = { ...defaults };
  for (const entry of (value ?? "").split(",")) {
    const [currency, rawRate] = entry.split("=").map(part => part.trim());
    const rate = Number(rawRate);
    if (currency && Number.isFinite(rate) && rate > 0) rates[currency.toUpperCase()] = rate;
  }
  return rates;
}

export const chargeRates = () => parseChargeRates(process.env.XDIGITEX_PAY_RATES);

/**
 * Amount in local currency units the gateway is asked to debit for a USD price. Returns null when no rate
 * is configured for that currency, so the caller refuses the payment instead of inventing a conversion.
 * Corridors bill in whole units, hence the rounding.
 */
export function localChargeAmount(rates: Readonly<Record<string, number>>, currency: string, usdAmount: number): LocalCharge | null {
  const code = currency.toUpperCase();
  const rate = rates[code];
  const converted = usdAmount * rate;
  if (!(rate > 0) || !Number.isFinite(converted) || converted <= 0) return null;
  return { currency: code, amount: Math.round(converted), rate };
}
