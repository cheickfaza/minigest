import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { serverEnv } from "../env";
import { SESSION_COOKIE, verifySession, type AdminSession } from "./session";

/** Reads and verifies the admin session from the request cookies (memoised per request). */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, serverEnv().SESSION_SECRET);
});

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Defence in depth: every server action and route handler of the back-office
 * calls this, independently of the routing proxy.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
