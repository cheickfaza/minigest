import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground shadow-xs transition-colors " +
  "placeholder:text-muted-foreground/80 hover:border-muted-foreground/60 " +
  "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 " +
  "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/30 disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-28 resize-y py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "h-10 cursor-pointer pr-8", className)} {...props} />;
}

export function Checkbox({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-5 shrink-0 cursor-pointer rounded border-border-strong accent-[var(--primary)] disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}
