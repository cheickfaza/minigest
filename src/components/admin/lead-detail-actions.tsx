"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { deleteLead, saveLeadNote } from "@/server/leads/admin-actions";

export function LeadNoteForm({ id, initialNote }: { id: string; initialNote: string | null }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [note, setNote] = useState(initialNote ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = note.trim() !== (initialNote ?? "").trim();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveLeadNote(id, note);
      if (res.ok) toast.success(t("toast.noteSaved"));
      else toast.error(t("toast.error"));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="admin-note" className="text-sm font-medium text-foreground">
          {t("lead.note")}
        </label>
        <p className="text-xs text-muted-foreground">{t("lead.noteHint")}</p>
      </div>
      <Textarea
        id="admin-note"
        value={note}
        maxLength={2000}
        onChange={(e) => setNote(e.currentTarget.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {pending ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            <>
              <Save aria-hidden="true" />
              {tCommon("save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function DeleteLeadButton({ id, fullName }: { id: string; fullName: string }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteLead(id);
      if (res.ok) {
        setOpen(false);
        toast.success(t("toast.deleted"));
        router.push("/admin/leads");
      } else {
        toast.error(t("toast.error"));
      }
    });
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden="true" />
        {tCommon("delete")}
      </Button>

      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        labelledBy="delete-lead-title"
        describedBy="delete-lead-desc"
      >
        <h2 id="delete-lead-title" className="text-lg font-semibold text-foreground">
          {t("lead.deleteTitle")}
        </h2>
        <p id="delete-lead-desc" className="mt-2 text-sm text-muted-foreground">
          {t("lead.deleteText", { name: fullName })}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button variant="danger" disabled={pending} onClick={confirmDelete}>
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {t("lead.deleteConfirm")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
