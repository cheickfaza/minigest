import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{t("notFoundTitle")}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("notFoundText")}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </main>
  );
}
