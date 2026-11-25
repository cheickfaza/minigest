import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // IANA time zone used to render dates on the server and the client.
    timeZone: process.env.APP_TIME_ZONE || "UTC",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
