export interface Country {
  code: string;
  name: string;
  dial: string;
  currency: string;
}

/** Countries served by Xdigitex Pay mobile money; network and currency are detected from the phone number. */
export const XDIGITEX_PAY_COUNTRIES: readonly Country[] = [
  { code: "BJ", name: "Bénin", dial: "+229", currency: "XOF" },
  { code: "BF", name: "Burkina Faso", dial: "+226", currency: "XOF" },
  { code: "CM", name: "Cameroun", dial: "+237", currency: "XAF" },
  { code: "CI", name: "Côte d’Ivoire", dial: "+225", currency: "XOF" },
  { code: "CD", name: "RD Congo", dial: "+243", currency: "CDF" },
  { code: "GA", name: "Gabon", dial: "+241", currency: "XAF" },
  { code: "KE", name: "Kenya", dial: "+254", currency: "KES" },
  { code: "CG", name: "Congo", dial: "+242", currency: "XAF" },
  { code: "RW", name: "Rwanda", dial: "+250", currency: "RWF" },
  { code: "SN", name: "Sénégal", dial: "+221", currency: "XOF" },
  { code: "SL", name: "Sierra Leone", dial: "+232", currency: "SLE" },
  { code: "UG", name: "Ouganda", dial: "+256", currency: "UGX" },
  { code: "ZM", name: "Zambie", dial: "+260", currency: "ZMW" },
] as const;

/**
 * Dial codes outside the served corridors. They only name the country detected from a phone number or a
 * browser locale, so the panel can tell the customer where the payment comes from: Mobile Money is not
 * offered there and the customer pays by card instead.
 */
const OTHER_DIAL_CODES: ReadonlyArray<readonly [dial: string, code: string, currency: string]> = [
  ["+213", "DZ", "DZD"],
  ["+216", "TN", "TND"],
  ["+218", "LY", "LYD"],
  ["+20", "EG", "EGP"],
  ["+220", "GM", "GMD"],
  ["+222", "MR", "MRU"],
  ["+223", "ML", "XOF"],
  ["+224", "GN", "GNF"],
  ["+227", "NE", "XOF"],
  ["+228", "TG", "XOF"],
  ["+230", "MU", "MUR"],
  ["+231", "LR", "LRD"],
  ["+233", "GH", "GHS"],
  ["+234", "NG", "NGN"],
  ["+235", "TD", "XAF"],
  ["+236", "CF", "XAF"],
  ["+238", "CV", "CVE"],
  ["+239", "ST", "STN"],
  ["+240", "GQ", "XAF"],
  ["+244", "AO", "AOA"],
  ["+245", "GW", "XOF"],
  ["+248", "SC", "SCR"],
  ["+249", "SD", "SDG"],
  ["+251", "ET", "ETB"],
  ["+252", "SO", "SOS"],
  ["+253", "DJ", "DJF"],
  ["+255", "TZ", "TZS"],
  ["+257", "BI", "BIF"],
  ["+258", "MZ", "MZN"],
  ["+261", "MG", "MGA"],
  ["+263", "ZW", "ZWL"],
  ["+264", "NA", "NAD"],
  ["+265", "MW", "MWK"],
  ["+266", "LS", "LSL"],
  ["+267", "BW", "BWP"],
  ["+268", "SZ", "SZL"],
  ["+269", "KM", "KMF"],
  ["+27", "ZA", "ZAR"],
  ["+211", "SS", "SSP"],
  ["+291", "ER", "ERN"],
  ["+1", "US", "USD"],
  ["+33", "FR", "EUR"],
  ["+32", "BE", "EUR"],
  ["+41", "CH", "CHF"],
  ["+44", "GB", "GBP"],
  ["+49", "DE", "EUR"],
  ["+34", "ES", "EUR"],
  ["+39", "IT", "EUR"],
  ["+351", "PT", "EUR"],
  ["+31", "NL", "EUR"],
  ["+353", "IE", "EUR"],
  ["+971", "AE", "AED"],
  ["+966", "SA", "SAR"],
  ["+91", "IN", "INR"],
  ["+86", "CN", "CNY"],
  ["+55", "BR", "BRL"],
  ["+52", "MX", "MXN"],
];

const regionNames = new Intl.DisplayNames("fr", { type: "region" });

/** French name of a region code, e.g. "GH" → "Ghana". */
export const countryLabel = (code: string) => regionNames.of(code) ?? code;

/** Digits only, so "+254 712 345 678", "00254712345678" and "254712345678" all match the same dial code. */
export const phoneDigits = (value: string) => value.replace(/\D/g, "").replace(/^00/, "");

export interface DetectedCountry extends Country {
  /** True only for the corridors Xdigitex Pay serves for mobile money. */
  supported: boolean;
}

/** Longest dial code first, so "+291" is never mistaken for "+29" and "+27" never wins over a three-digit code. */
const otherDialCodes = [...OTHER_DIAL_CODES].sort((left, right) => right[0].length - left[0].length);

/**
 * Country of a phone number, read from its dial code. Anything the customer types wins over the locale,
 * so the country is never asked for and no redirect or extra step is involved.
 */
export function detectPhoneCountry(phone: string): DetectedCountry | null {
  const value = phoneDigits(phone);
  if (!value) return null;
  const served = XDIGITEX_PAY_COUNTRIES.find(country => value.startsWith(phoneDigits(country.dial)));
  if (served) return { ...served, supported: true };
  const other = otherDialCodes.find(([dial]) => value.startsWith(phoneDigits(dial)));
  return other ? { code: other[1], name: countryLabel(other[1]), dial: other[0], currency: other[2], supported: false } : null;
}

/**
 * Browser-locale pre-selection (navigator.language, e.g. "fr-KE"): used until the customer types a phone
 * number, so the panel shows a country and currency with no input at all.
 */
export function detectLocaleCountry(locale: string | null | undefined): DetectedCountry | null {
  const region = localeRegion(locale);
  if (!region) return null;
  const served = XDIGITEX_PAY_COUNTRIES.find(country => country.code === region);
  if (served) return { ...served, supported: true };
  const other = otherDialCodes.find(([, code]) => code === region);
  return other ? { code: other[1], name: countryLabel(other[1]), dial: other[0], currency: other[2], supported: false } : null;
}

function localeRegion(locale: string | null | undefined): string | null {
  if (!locale) return null;
  try {
    return new Intl.Locale(locale).region ?? null;
  } catch {
    return null;
  }
}

/** The served corridor for a phone number, or null when its dial code is not covered by Mobile Money. */
export function findSupportedCountry(phone: string) {
  const value = phoneDigits(phone);
  return XDIGITEX_PAY_COUNTRIES.find(country => value.startsWith(phoneDigits(country.dial))) ?? null;
}
