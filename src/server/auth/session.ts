import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "minigest_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface AdminSession {
  email: string;
}

function key(secret: string): Uint8Array {
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

/** Signs a stateless session token (JWT, HS256). Edge-runtime compatible. */
export async function signSession(session: AdminSession, secret: string, now = new Date()): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.email)
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS)
    .setIssuer("minigest")
    .setAudience("minigest-admin")
    .sign(key(secret));
}

/** Returns the session when the token is authentic and not expired, otherwise null. */
export async function verifySession(token: string | undefined, secret: string): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      algorithms: ["HS256"],
      issuer: "minigest",
      audience: "minigest-admin",
    });
    if (payload.role !== "admin" || typeof payload.sub !== "string") return null;
    return { email: payload.sub };
  } catch {
    return null;
  }
}
