import { APP_CURRENCY } from "./currency";

export const moneyFormat = (currency: string = APP_CURRENCY, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 2, ...options });

export const money = (value: number, currency: string = APP_CURRENCY) => moneyFormat(currency).format(value);
export const amount = (value: number) => moneyFormat(APP_CURRENCY, { maximumFractionDigits: 0 }).format(value);
export const number = (value: number) => new Intl.NumberFormat("fr-FR").format(value);
export const percent = (value: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
