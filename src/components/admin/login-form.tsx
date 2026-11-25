"use client";

import { CircleAlert, Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login, type LoginState } from "@/server/auth/actions";

const initialState: LoginState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const locale = useLocale();
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(login.bind(null, locale), initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock aria-hidden="true" className="size-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={nextPath} />

          {state.error ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{t(state.error)}</span>
            </div>
          ) : null}

          <Field id="login-email" label={t("email")} required>
            {(aria) => (
              <Input
                {...aria}
                name="email"
                type="email"
                autoComplete="username"
                required
                defaultValue={state.email ?? ""}
              />
            )}
          </Field>

          <Field id="login-password" label={t("password")} required>
            {(aria) => <Input {...aria} name="password" type="password" autoComplete="current-password" required />}
          </Field>

          <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
