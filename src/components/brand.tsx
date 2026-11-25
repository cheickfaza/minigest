import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight text-foreground", className)}>
      <span
        aria-hidden="true"
        className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-xs"
      >
        MG
      </span>
      <span className="text-base">MiniGest</span>
    </span>
  );
}
