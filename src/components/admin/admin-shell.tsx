"use client";

import { ExternalLink, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useState } from "react";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/server/auth/actions";

interface AdminShellProps {
  adminEmail: string;
  pendingCount: number;
  children: React.ReactNode;
}

export function AdminShell({ adminEmail, pendingCount, children }: AdminShellProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("admin");
  const tAuth = useTranslations("auth");
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard, active: pathname === "/admin" },
    {
      href: "/admin/leads",
      label: t("nav.leads"),
      icon: Users,
      active: pathname.startsWith("/admin/leads"),
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link href="/admin" onClick={() => setMenuOpen(false)}>
          <Brand />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t("nav.closeMenu")}
          onClick={() => setMenuOpen(false)}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <nav aria-label={t("nav.label")} className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon, active, badge }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2.5">
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </span>
            {badge !== undefined ? <Badge tone="warning">{badge}</Badge> : null}
          </Link>
        ))}

        <div className="my-3 border-t border-border" />

        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          {t("nav.viewSite")}
        </Link>
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">{t("signedInAs")}</p>
        <p className="truncate text-sm font-medium text-foreground">{adminEmail}</p>
        <form action={logout.bind(null, locale)} className="mt-3">
          <Button type="submit" variant="secondary" size="sm" className="w-full justify-center">
            <LogOut aria-hidden="true" />
            {tAuth("logout")}
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-e border-border bg-surface lg:sticky lg:top-0 lg:block lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-surface shadow-2xl">{sidebarContent}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={t("nav.openMenu")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
            <span className="font-semibold text-foreground lg:hidden">MiniGest</span>
          </div>
          <div className="flex items-center gap-2">
            <Suspense fallback={<div className="h-9 w-24" />}>
              <LocaleSwitcher />
            </Suspense>
            <ThemeToggle />
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
