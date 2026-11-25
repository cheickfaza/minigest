import { ArrowLeft, Building2, Globe, Mail, Phone, ShieldCheck } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ContactedToggle } from "@/components/admin/contacted-toggle";
import { DeleteLeadButton, LeadNoteForm } from "@/components/admin/lead-detail-actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatPhone } from "@/lib/phone";
import { initials } from "@/lib/utils";
import { leadRepository } from "@/server/leads";

export const dynamic = "force-dynamic";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!z.uuid().safeParse(id).success) notFound();
  const lead = await (await leadRepository()).findById(id);
  if (!lead) notFound();

  const t = await getTranslations("admin.lead");
  const tStatus = await getTranslations("admin.status");
  const format = await getFormatter();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ms-3">
          <Link href="/admin/leads">
            <ArrowLeft aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={`mailto:${lead.email}`}>
              <Mail aria-hidden="true" />
              {t("sendEmail")}
            </a>
          </Button>
          {lead.phone ? (
            <Button asChild variant="secondary" size="sm">
              <a href={`tel:${lead.phone}`}>
                <Phone aria-hidden="true" />
                {t("call")}
              </a>
            </Button>
          ) : null}
          <DeleteLeadButton id={lead.id} fullName={lead.fullName} />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-lg font-bold text-primary">
          {initials(lead.fullName)}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{lead.fullName}</h1>
            <Badge tone={lead.contacted ? "success" : "warning"}>
              {lead.contacted ? tStatus("contacted") : tStatus("pending")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("received", {
              date: format.dateTime(lead.createdAt, { dateStyle: "long", timeStyle: "short" }),
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: details + message */}
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>{t("contactInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              <dl className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Mail aria-hidden="true" className="size-4" />
                    {t("email")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    <a href={`mailto:${lead.email}`} className="hover:text-primary hover:underline">
                      {lead.email}
                    </a>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Phone aria-hidden="true" className="size-4" />
                    {t("phone")}
                  </dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="hover:text-primary hover:underline">
                        {formatPhone(lead.phone)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{t("notProvided")}</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Building2 aria-hidden="true" className="size-4" />
                    {t("company")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {lead.company ?? <span className="text-muted-foreground">{t("notProvided")}</span>}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Globe aria-hidden="true" className="size-4" />
                    {t("locale")}
                  </dt>
                  <dd className="font-medium uppercase text-foreground">{lead.locale}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    {t("consent")}
                  </dt>
                  <dd className="text-muted-foreground tabular-nums">
                    {format.dateTime(lead.consentAt, { dateStyle: "medium", timeStyle: "short" })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("message")}</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.message ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{lead.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noMessage")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: admin follow-up */}
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>{t("status")}</CardTitle>
              <CardDescription>{t("contactedHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted/50 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("contacted")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lead.contacted && lead.contactedAt && lead.contactedBy
                      ? t("contactedOn", {
                          date: format.dateTime(lead.contactedAt, { dateStyle: "medium", timeStyle: "short" }),
                          by: lead.contactedBy,
                        })
                      : t("pending")}
                  </p>
                </div>
                <ContactedToggle
                  id={lead.id}
                  fullName={lead.fullName}
                  contacted={lead.contacted}
                  variant="switch"
                />
              </div>

              <LeadNoteForm id={lead.id} initialNote={lead.adminNote} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
