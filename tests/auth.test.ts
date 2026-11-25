import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/server/auth/password";
import { signSession, verifySession } from "@/server/auth/session";

const SECRET = "a".repeat(32);

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(hash).not.toContain("$");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
    await expect(verifyPassword("x", "garbage")).resolves.toBe(false);
  });
});

describe("admin session", () => {
  it("round-trips a signed token", async () => {
    const token = await signSession({ email: "admin@example.com" }, SECRET);
    await expect(verifySession(token, SECRET)).resolves.toEqual({ email: "admin@example.com" });
  });

  it("rejects tampered, foreign or expired tokens", async () => {
    const token = await signSession({ email: "admin@example.com" }, SECRET);
    await expect(verifySession(`${token}x`, SECRET)).resolves.toBeNull();
    await expect(verifySession(token, "b".repeat(32))).resolves.toBeNull();
    await expect(verifySession(undefined, SECRET)).resolves.toBeNull();

    const old = await signSession({ email: "admin@example.com" }, SECRET, new Date("2020-01-01"));
    await expect(verifySession(old, SECRET)).resolves.toBeNull();
  });

  it("refuses weak secrets", async () => {
    await expect(signSession({ email: "a@b.co" }, "short")).rejects.toThrow(/32 characters/);
  });
});
