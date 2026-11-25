import { ArrowRight, CheckCircle2, Clock, TrendingUp, Users } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { ContactedToggle } from "@/components/admin/contacted-toggle";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { initials } from "@/lib/utils";
import { leadRepository } from "@/server/leads";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.dashboard");
  const format = await getFormatter();

  const repo = await leadRepository();
  const [stats, pendingQueue] = await Promise.all([
    repo.stats(),
    repo.list({ status: "pending", sort: "oldest", pageSize: 5 }),
  ]);

  const rate = stats.total > 0 ? Math.round((stats.contacted / stats.total) * 100) : 0;
  const maxDay = Math.max(1, ...stats.daily.map((d) => d.count));
  const periodTotal = stats.daily.reduce((sum, d) => sum + d.count, 0);

  const kpis = [
    { label: t("kpi.total"), value: stats.total, icon: Users, tone: "text-primary bg-primary-soft" },
    { label: t("kpi.pending"), value: stats.pending, icon: Clock, tone: "text-warning bg-warning-soft" },
    { label: t("kpi.contacted"), value: stats.contacted, icon: CheckCircle2, tone: "text-success bg-success-soft" },
    { label: t("kpi.last7"), value: stats.last7Days, icon: TrendingUp, tone: "text-primary bg-surface-muted" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground tabular-nums">
                  {format.number(value)}
                </p>
              </div>
              <span className={`flex size-10 items-center justify-center rounded-lg ${tone}`}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact rate bar */}
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{t("kpi.rate")}</span>
            <span className="font-semibold text-foreground tabular-nums">{rate}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={t("kpi.rate")}
            aria-valuenow={rate}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${rate}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 14-day chart */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>{t("chartTitle")}</CardTitle>
            <CardDescription>{t("chartSummary", { total: periodTotal })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-1.5 pt-4" role="img" aria-label={t("chartTitle")}>
              {stats.daily.map((day) => {
                const heightPct = day.count === 0 ? 4 : Math.max(12, Math.round((day.count / maxDay) * 100));
                const shortDate = format.dateTime(new Date(`${day.date}T12:00:00Z`), {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div
                    key={day.date}
                    title={`${shortDate}: ${day.count}`}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 tabular-nums">
                      {day.count}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-colors ${
                        day.count > 0 ? "bg-primary group-hover:bg-primary-hover" : "bg-surface-muted"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>
                {format.dateTime(new Date(`${stats.daily[0]!.date}T12:00:00Z`), { month: "short", day: "numeric" })}
              </span>
              <span>
                {format.dateTime(new Date(`${stats.daily.at(-1)!.date}T12:00:00Z`), {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Queue */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t("queueTitle")}</CardTitle>
              <CardDescription>{t("queueSubtitle")}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/leads?status=pending">
                {t("seeAll")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingQueue.items.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("queueEmpty")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {pendingQueue.items.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <ContactedToggle id={lead.id} fullName={lead.fullName} contacted={lead.contacted} />
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {initials(lead.fullName)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {lead.fullName}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                    <Badge tone="neutral" className="shrink-0">
                      {format.dateTime(lead.createdAt, { month: "short", day: "numeric" })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
