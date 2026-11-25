"use server";

import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";
import { createRateLimiter } from "@/lib/rate-limit";
import { createLeadSchema, fieldErrors, type LeadField } from "@/lib/validation";

import { clientIp } from "../request";
import { leadRepository } from "./index";

export type SubmitLeadState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      /** Field → i18n key under `validation.*`. */
      errors?: Partial<Record<LeadField, string>>;
      /** Form-level error, i18n key under `public.form.*`. */
      formError?: "rateLimited" | "serverError";
      /** Submitted values, so the form is re-populated without JavaScript. */
      values: Record<string, string>;
    };

// 5 submissions per IP per 10 minutes.
const limiter = createRateLimiter(5, 10 * 60_000);

const TEXT_FIELDS = ["fullName", "email", "phone", "company", "message"] as const;

/** Public contact form handler (works with and without JavaScript). */
export async function submitLead(locale: string, _prev: SubmitLeadState, formData: FormData): Promise<SubmitLeadState> {
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const values = Object.fromEntries(TEXT_FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));

  // Honeypot: bots fill every field, humans never see this one. Pretend success.
  if (String(formData.get("website") ?? "") !== "") return { status: "success" };

  const parsed = createLeadSchema(safeLocale).safeParse({ ...values, consent: formData.get("consent") === "on" });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), values };

  if (!limiter.check(await clientIp())) return { status: "error", formError: "rateLimited", values };

  try {
    // Duplicates are silently accepted so the form never reveals whether an address is already known.
    await (await leadRepository()).create(parsed.data, safeLocale);
    return { status: "success" };
  } catch (error) {
    console.error("[submitLead] failed", error);
    return { status: "error", formError: "serverError", values };
  }
}
