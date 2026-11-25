"use client";

import { CheckCircle2, CircleAlert, Loader2, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { LEAD_LIMITS } from "@/lib/validation";
import { submitLead, type SubmitLeadState } from "@/server/leads/actions";

const initialState: SubmitLeadState = { status: "idle" };

export function LeadForm() {
  const locale = useLocale();
  const t = useTranslations("public.form");
  const tCommon = useTranslations("common");
  const tVal = useTranslations("validation");

  const [state, action, pending] = useActionState(submitLead.bind(null, locale), initialState);
  const [resetKey, setResetKey] = useState(0);
  const [messageLen, setMessageLen] = useState(0);
  const [dismissedSuccess, setDismissedSuccess] = useState(false);

  const showSuccess = state.status === "success" && !dismissedSuccess;

  if (showSuccess) {
    return (
      <Card className="border-success/30">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 aria-hidden="true" className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">{t("successTitle")}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{t("successText")}</p>
          </div>
          <Button
            variant="secondary"
            className="mt-2"
            onClick={() => {
              setDismissedSuccess(true);
              setMessageLen(0);
              setResetKey((k) => k + 1);
            }}
          >
            {t("newRequest")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const errors = state.status === "error" ? (state.errors ?? {}) : {};
  const values = state.status === "error" ? state.values : {};
  const errorCount = Object.keys(errors).length;

  function translateError(key?: string) {
    if (!key) return undefined;
    try {
      return tVal(key as Parameters<typeof tVal>[0]);
    } catch {
      return key;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          key={resetKey}
          action={(formData) => {
            setDismissedSuccess(false);
            return action(formData);
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          {state.status === "error" && (state.formError || errorCount > 0) ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {state.formError
                  ? t(state.formError)
                  : t("errorSummary", { count: errorCount })}
              </span>
            </div>
          ) : null}

          {/* Honeypot field: hidden from humans and assistive tech */}
          <div aria-hidden="true" className="hidden">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <Field id="fullName" label={t("fullName")} required error={translateError(errors.fullName)}>
            {(aria) => (
              <Input
                {...aria}
                name="fullName"
                type="text"
                autoComplete="name"
                maxLength={LEAD_LIMITS.fullNameMax}
                placeholder={t("fullNamePlaceholder")}
                defaultValue={values.fullName ?? ""}
              />
            )}
          </Field>

          <Field id="email" label={t("email")} required error={translateError(errors.email)}>
            {(aria) => (
              <Input
                {...aria}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={LEAD_LIMITS.emailMax}
                placeholder={t("emailPlaceholder")}
                defaultValue={values.email ?? ""}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="phone"
              label={t("phone")}
              optionalLabel={tCommon("optional")}
              hint={t("phoneHint")}
              error={translateError(errors.phone)}
            >
              {(aria) => (
                <Input
                  {...aria}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+33 6 12 34 56 78"
                  defaultValue={values.phone ?? ""}
                />
              )}
            </Field>

            <Field
              id="company"
              label={t("company")}
              optionalLabel={tCommon("optional")}
              error={translateError(errors.company)}
            >
              {(aria) => (
                <Input
                  {...aria}
                  name="company"
                  type="text"
                  autoComplete="organization"
                  maxLength={LEAD_LIMITS.companyMax}
                  defaultValue={values.company ?? ""}
                />
              )}
            </Field>
          </div>

          <Field
            id="message"
            label={t("message")}
            optionalLabel={tCommon("optional")}
            hint={t("characters", { count: messageLen, max: LEAD_LIMITS.messageMax })}
            error={translateError(errors.message)}
          >
            {(aria) => (
              <Textarea
                {...aria}
                name="message"
                maxLength={LEAD_LIMITS.messageMax}
                placeholder={t("messagePlaceholder")}
                defaultValue={values.message ?? ""}
                onChange={(e) => setMessageLen(e.currentTarget.value.length)}
              />
            )}
          </Field>

          <div className="space-y-1.5 pt-1">
            <label htmlFor="consent" className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
              <Checkbox
                id="consent"
                name="consent"
                aria-required="true"
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? "consent-error" : undefined}
                className="mt-0.5"
              />
              <span className="leading-snug">
                {t.rich("consent", {
                  link: (chunks) => (
                    <Link href="/privacy" className="font-medium text-primary underline underline-offset-2">
                      {chunks}
                    </Link>
                  ),
                })}
                <span aria-hidden="true" className="ms-0.5 text-danger">
                  *
                </span>
              </span>
            </label>
            {errors.consent ? (
              <p id="consent-error" className="flex items-start gap-1.5 text-sm text-danger">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {translateError(errors.consent)}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Send aria-hidden="true" />
                {t("submit")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
