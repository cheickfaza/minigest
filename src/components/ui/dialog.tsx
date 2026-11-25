"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Modal built on the native <dialog> element: focus trapping, Escape to close
 * and inert background come from the platform (WAI-ARIA dialog pattern).
 */
export function Dialog({ open, onClose, labelledBy, describedBy, className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-border bg-surface p-6 text-foreground shadow-2xl",
        className,
      )}
    >
      {children}
    </dialog>
  );
}
