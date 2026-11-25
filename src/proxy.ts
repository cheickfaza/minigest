import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { SESSION_COOKIE, verifySession } from "@/server/auth/session";

const intl = createIntlMiddleware(routing);

const ADMIN_PATH = /^\/(fr|en)\/admin(\/.*)?$/;
const PUBLIC_ADMIN_PATH = /^\/(fr|en)\/admin\/login\/?$/;

/**
 * Request pipeline:
 * 1. locale negotiation (Accept-Language → /fr or /en);
 * 2. optimistic admin gate — unauthenticated visitors are redirected to the
 *    login page. Pages and server actions re-check the session (defence in depth).
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const match = ADMIN_PATH.exec(pathname);

  if (match && !PUBLIC_ADMIN_PATH.test(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token, process.env.SESSION_SECRET ?? "").catch(() => null);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = `/${match[1]}/admin/login`;
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  const response = intl(request);
  if (match) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  // Everything except API routes, Next.js internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
