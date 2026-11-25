import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/admin/login-form";
import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getAdminSession } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession().catch(() => null);
  if (session) redirect(`/${locale}/admin`);

  const { next } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            {t("backToSite")}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Suspense fallback={<div className="h-9 w-24" />}>
            <LocaleSwitcher />
          </Suspense>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-6">
          <Brand />
        </div>
        <LoginForm nextPath={next ?? `/${locale}/admin`} />
      </main>
    </div>
  );
}
