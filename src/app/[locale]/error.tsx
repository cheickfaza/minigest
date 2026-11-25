"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");

  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("errorTitle")}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("errorText")}</p>
      <Button className="mt-6" onClick={reset}>
        {t("retry")}
      </Button>
    </main>
  );
}
