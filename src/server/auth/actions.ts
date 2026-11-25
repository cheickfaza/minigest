"use server";

import { hasLocale } from "next-intl";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { routing } from "@/i18n/routing";
import { createRateLimiter } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

import { serverEnv } from "../env";
import { clientIp } from "../request";
import { verifyPassword } from "./password";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "./session";

export type LoginState = { error?: "invalid" | "rateLimited"; email?: string };

// 10 attempts per IP per 15 minutes (brute-force mitigation).
const limiter = createRateLimiter(10, 15 * 60_000);

/** Accept only same-site admin paths as post-login destination (prevents open redirects). */
function safeNext(next: string, locale: string): string {
  return /^\/(fr|en)\/admin(\/[\w\-/]*)?(\?[\w=&%-]*)?$/.test(next) && !next.includes("//")
    ? next
    : `/${locale}/admin`;
}

export async function login(locale: string, _prev: LoginState, formData: FormData): Promise<LoginState> {
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const email = String(formData.get("email") ?? "");
  const ip = await clientIp();

  if (!limiter.check(ip)) return { error: "rateLimited", email };

  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  const env = serverEnv();
  // Always run the KDF so response time does not reveal whether the e-mail matched.
  const passwordOk = await verifyPassword(parsed.success ? parsed.data.password : "", env.ADMIN_PASSWORD_HASH);
  if (!parsed.success || !passwordOk || parsed.data.email !== env.ADMIN_EMAIL) {
    return { error: "invalid", email };
  }

  limiter.reset(ip);
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession({ email: env.ADMIN_EMAIL }, env.SESSION_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(safeNext(String(formData.get("next") ?? ""), safeLocale));
}

export async function logout(locale: string): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect(`/${hasLocale(routing.locales, locale) ? locale : routing.defaultLocale}/admin/login`);
}
