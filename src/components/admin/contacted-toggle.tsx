"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { setLeadContacted } from "@/server/leads/admin-actions";

interface ContactedToggleProps {
  id: string;
  fullName: string;
  contacted: boolean;
  /** Compact checkbox for tables, or labelled switch for detail views. */
  variant?: "compact" | "switch";
}

export function ContactedToggle({ id, fullName, contacted, variant = "compact" }: ContactedToggleProps) {
  const t = useTranslations("admin");
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(contacted);

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const res = await setLeadContacted(id, next);
      if (res.ok) {
        toast.success(next ? t("toast.contacted", { name: fullName }) : t("toast.uncontacted", { name: fullName }));
      } else {
        toast.error(t("toast.error"));
      }
    });
  }

  if (variant === "switch") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label={t("leads.markContacted", { name: fullName })}
        disabled={pending}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-60",
          optimistic ? "bg-success" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "pointer-events-none flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform",
            optimistic ? "translate-x-5" : "translate-x-0.5",
          )}
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="size-3 animate-spin text-muted-foreground" />
          ) : optimistic ? (
            <Check aria-hidden="true" className="size-3 text-success" />
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={t("leads.markContacted", { name: fullName })}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors disabled:opacity-60",
        optimistic
          ? "border-success bg-success text-white dark:text-background"
          : "border-border-strong bg-surface hover:border-primary",
      )}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : optimistic ? (
        <Check aria-hidden="true" className="size-3.5 stroke-[2.5]" />
      ) : null}
    </button>
  );
}
