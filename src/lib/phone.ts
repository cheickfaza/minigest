import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

/** Default dialling region inferred from the UI locale. */
export function defaultRegionForLocale(locale: string): CountryCode {
  return locale.toLowerCase().startsWith("en") ? "US" : "FR";
}

/**
 * Normalises a phone number to E.164 (ITU-T international format).
 * Accepts national formats for the default region ("06 12 34 56 78") and any
 * international number prefixed with "+" or "00".
 * Returns `null` when the input is not a valid phone number.
 */
export function toE164(raw: string, defaultRegion: CountryCode = "FR"): string | null {
  const input = raw.trim().replace(/^00/, "+");
  if (!input) return null;
  const parsed = parsePhoneNumberFromString(input, defaultRegion);
  return parsed?.isValid() ? parsed.number : null;
}

/** Human-friendly international rendering: "+33 6 12 34 56 78". */
export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
