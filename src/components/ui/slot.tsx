import { cloneElement, isValidElement, type ReactElement } from "react";

import { cn } from "@/lib/utils";

/** Minimal `asChild` helper: merges className and props into the only child. */
export function Slot({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  if (!isValidElement(children)) return null;
  const child = children as ReactElement<{ className?: string }>;
  return cloneElement(child, { ...props, className: cn(className, child.props.className) });
}
