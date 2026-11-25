import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("public");
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded-lg focus-visible:outline-offset-4">
            <Brand />
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/privacy"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
              {t("nav.privacy")}
            </Link>
            <Suspense fallback={<div className="h-9 w-24" />}>
              <LocaleSwitcher />
            </Suspense>
            <ThemeToggle />
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin">
                <ShieldCheck aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">{t("nav.admin")}</span>
                <span className="sm:hidden">Admin</span>
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>{t("footer.rights", { year })}</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              {t("footer.privacy")}
            </Link>
            <Link href="/admin" className="hover:text-foreground hover:underline">
              {t("nav.admin")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
