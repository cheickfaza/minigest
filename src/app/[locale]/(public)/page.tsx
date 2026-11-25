import { Clock, Lock, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LeadForm } from "@/components/public/lead-form";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.hero");

  const highlights = [
    { icon: Clock, text: t("points.fast") },
    { icon: Sparkles, text: t("points.free") },
    { icon: Lock, text: t("points.privacy") },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-6 lg:col-span-5 lg:pt-4">
          <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            {t("eyebrow")}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{t("subtitle")}</p>

          <ul className="space-y-3 pt-2">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium text-foreground">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
