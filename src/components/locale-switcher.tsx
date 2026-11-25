"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(nextLocale: Locale) {
    if (nextLocale === locale) return;
    const query = searchParams.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.replace(target, { locale: nextLocale });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex h-9 items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-medium",
        pending && "opacity-70",
        className,
      )}
    >
      <Globe aria-hidden="true" className="ms-2 me-1 size-3.5 text-muted-foreground" />
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            aria-pressed={active}
            onClick={() => switchTo(code)}
            className={cn(
              "rounded-md px-2 py-1 uppercase transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
