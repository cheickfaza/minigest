import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { ContactedToggle } from "@/components/admin/contacted-toggle";
import { LeadsToolbar } from "@/components/admin/leads-toolbar";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatPhone } from "@/lib/phone";
import { initials } from "@/lib/utils";
import { leadRepository } from "@/server/leads";
import type { LeadSort, LeadStatusFilter } from "@/server/leads/repository";

export const dynamic = "force-dynamic";

const VALID_STATUS: LeadStatusFilter[] = ["all", "pending", "contacted"];
const VALID_SORT: LeadSort[] = ["newest", "oldest", "name"];

export default async function AdminLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const status: LeadStatusFilter = VALID_STATUS.includes(sp.status as LeadStatusFilter)
    ? (sp.status as LeadStatusFilter)
    : "all";
  const sort: LeadSort = VALID_SORT.includes(sp.sort as LeadSort) ? (sp.sort as LeadSort) : "newest";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const t = await getTranslations("admin.leads");
  const tStatus = await getTranslations("admin.status");
  const format = await getFormatter();

  const repo = await leadRepository();
  const data = await repo.list({ q, status, sort, page, pageSize: 20 });
  const hasFilters = Boolean(q || status !== "all");

  function pageHref(targetPage: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status !== "all") p.set("status", status);
    if (sort !== "newest") p.set("sort", sort);
    if (targetPage > 1) p.set("page", String(targetPage));
    const qs = p.toString();
    return qs ? `/admin/leads?${qs}` : "/admin/leads";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { total: data.total })}</p>
      </div>

      <Suspense fallback={<div className="h-24" />}>
        <LeadsToolbar q={q} status={status} sort={sort} />
      </Suspense>

      <Card className="overflow-hidden">
        {data.items.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="max-w-md text-sm text-muted-foreground">{hasFilters ? t("empty") : t("emptyAll")}</p>
            {hasFilters ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin/leads">{t("clearFilters")}</Link>
              </Button>
            ) : null}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/70 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="w-24 px-4 py-3 text-center">
                    {t("columns.contacted")}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t("columns.name")}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 md:table-cell">
                    {t("columns.phone")}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 lg:table-cell">
                    {t("columns.company")}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                    {t("columns.received")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-surface-muted/50">
                    <td className="px-4 py-3.5 text-center">
                      <ContactedToggle id={lead.id} fullName={lead.fullName} contacted={lead.contacted} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                          {initials(lead.fullName)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/leads/${lead.id}`}
                              className="truncate font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {lead.fullName}
                            </Link>
                            <Badge tone={lead.contacted ? "success" : "warning"}>
                              {lead.contacted ? tStatus("contacted") : tStatus("pending")}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-muted-foreground md:table-cell tabular-nums">
                      {lead.phone ? formatPhone(lead.phone) : "—"}
                    </td>
                    <td className="hidden px-4 py-3.5 text-muted-foreground lg:table-cell">
                      {lead.company ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3.5 text-muted-foreground sm:table-cell tabular-nums">
                      {format.dateTime(lead.createdAt, { dateStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/leads/${lead.id}`}>
                          <Eye aria-hidden="true" />
                          <span className="hidden sm:inline">{t("view")}</span>
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.pageCount > 1 ? (
        <nav aria-label={t("pagination.label")} className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("pagination.page", { page: data.page, count: data.pageCount })}
          </p>
          <div className="flex items-center gap-2">
            {data.page > 1 ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={pageHref(data.page - 1)}>
                  <ChevronLeft aria-hidden="true" />
                  {t("pagination.previous")}
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                <ChevronLeft aria-hidden="true" />
                {t("pagination.previous")}
              </Button>
            )}
            {data.page < data.pageCount ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={pageHref(data.page + 1)}>
                  {t("pagination.next")}
                  <ChevronRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                {t("pagination.next")}
                <ChevronRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
