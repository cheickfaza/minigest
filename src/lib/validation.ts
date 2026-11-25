import { z } from "zod";

import { defaultRegionForLocale, toE164 } from "@/lib/phone";

/**
 * Validation rules shared by the browser (instant feedback) and the server
 * (source of truth). Error messages are i18n keys under `validation.*`.
 */
export const LEAD_LIMITS = {
  fullNameMin: 2,
  fullNameMax: 80,
  emailMax: 254,
  companyMax: 120,
  messageMax: 1000,
} as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: "tooLong" })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export function createLeadSchema(locale = "fr") {
  const region = defaultRegionForLocale(locale);

  return z.object({
    fullName: z
      .string()
      .trim()
      .min(LEAD_LIMITS.fullNameMin, { message: "fullNameTooShort" })
      .max(LEAD_LIMITS.fullNameMax, { message: "tooLong" }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(LEAD_LIMITS.emailMax, { message: "tooLong" })
      .pipe(z.email({ message: "emailInvalid" })),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const e164 = toE164(v, region);
        if (!e164) {
          ctx.addIssue({ code: "custom", message: "phoneInvalid" });
          return z.NEVER;
        }
        return e164;
      }),
    company: optionalText(LEAD_LIMITS.companyMax),
    message: optionalText(LEAD_LIMITS.messageMax),
    consent: z.literal(true, { message: "consentRequired" }),
  });
}

export type LeadInput = z.output<ReturnType<typeof createLeadSchema>>;
export type LeadField = keyof z.input<ReturnType<typeof createLeadSchema>>;

/** Flattens Zod issues into `{ field: i18nKey }` (first error per field). */
export function fieldErrors(error: z.ZodError): Partial<Record<LeadField, string>> {
  const out: Partial<Record<LeadField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as LeadField | undefined;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}

export const adminNoteSchema = z.string().trim().max(2000, { message: "tooLong" });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ message: "emailInvalid" })),
  password: z.string().min(1, { message: "required" }).max(200),
});
