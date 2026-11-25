import { ArrowLeft } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const tCommon = await getTranslations("common");
  const format = await getFormatter();

  const updated = format.dateTime(new Date("2026-11-25T00:00:00Z"), { dateStyle: "long" });

  const sections = [
    { title: t("sections.dataTitle"), text: t("sections.dataText") },
    { title: t("sections.purposeTitle"), text: t("sections.purposeText") },
    { title: t("sections.retentionTitle"), text: t("sections.retentionText") },
    { title: t("sections.rightsTitle"), text: t("sections.rightsText") },
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ms-3 mb-6">
        <Link href="/">
          <ArrowLeft aria-hidden="true" />
          {tCommon("backHome")}
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("updated", { date: updated })}</p>

      <Card className="mt-8">
        <CardContent className="divide-y divide-border p-0">
          {sections.map((section) => (
            <section key={section.title} className="space-y-1.5 px-6 py-5">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{section.text}</p>
            </section>
          ))}
        </CardContent>
      </Card>
    </article>
  );
}
