import "server-only";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  ADMIN_PASSWORD_HASH: z.string().startsWith("scrypt:", "Run `npm run admin:hash -- <password>`"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | undefined;

/** Validated server-side configuration. Fails fast with an explicit message. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${details}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
