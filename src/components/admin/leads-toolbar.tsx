"use client";

import { Download, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LeadSort, LeadStatusFilter } from "@/server/leads/repository";

interface LeadsToolbarProps {
  q: string;
  status: LeadStatusFilter;
  sort: LeadSort;
}

export function LeadsToolbar({ q, status, sort }: LeadsToolbarProps) {
  const t = useTranslations("admin.leads");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [k, v] of Object.entries(patch)) {
      if (!v || (k === "status" && v === "all") || (k === "sort" && v === "newest")) {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function onSearchChange(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() || undefined }), 250);
  }

  const statuses: LeadStatusFilter[] = ["all", "pending", "contacted"];

  return (
    <div className={cn("flex flex-col gap-3", pending && "opacity-80")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label={t("status")} className="inline-flex rounded-lg border border-border bg-surface p-1">
          {statuses.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => update({ status: s })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`filters.${s}`)}
              </button>
            );
          })}
        </div>

        <Button asChild variant="secondary" size="sm">
          <a href="/api/admin/leads/export" download>
            <Download aria-hidden="true" />
            {t("export")}
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={t("search")}
            placeholder={t("searchPlaceholder")}
            defaultValue={q}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            className="ps-9 pe-9"
          />
          {q ? (
            <button
              type="button"
              aria-label={t("clearFilters")}
              onClick={() => update({ q: undefined })}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="sm:w-52">
          <Select
            aria-label={t("sort")}
            value={sort}
            onChange={(e) => update({ sort: e.currentTarget.value })}
          >
            <option value="newest">{t("sorts.newest")}</option>
            <option value="oldest">{t("sorts.oldest")}</option>
            <option value="name">{t("sorts.name")}</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
