"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adminNoteSchema } from "@/lib/validation";

import { requireAdmin } from "../auth/guard";
import { leadRepository } from "./index";

export type ActionResult = { ok: true } | { ok: false; error: "notFound" | "invalid" | "unauthorized" | "server" };

const idSchema = z.uuid();

async function run(id: string, fn: (adminEmail: string) => Promise<boolean>): Promise<ActionResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false, error: "unauthorized" };
  }
  if (!idSchema.safeParse(id).success) return { ok: false, error: "invalid" };

  try {
    const found = await fn(admin.email);
    if (!found) return { ok: false, error: "notFound" };
  } catch (error) {
    console.error("[admin action] failed", error);
    return { ok: false, error: "server" };
  }

  revalidatePath("/[locale]/admin", "layout");
  return { ok: true };
}

/** Only an authenticated administrator can tick / untick "contacted". */
export async function setLeadContacted(id: string, contacted: boolean): Promise<ActionResult> {
  return run(id, async (adminEmail) => {
    const repo = await leadRepository();
    return (await repo.setContacted(id, Boolean(contacted), adminEmail)) !== null;
  });
}

export async function saveLeadNote(id: string, note: string): Promise<ActionResult> {
  const parsed = adminNoteSchema.safeParse(note);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return run(id, async () => (await (await leadRepository()).updateNote(id, parsed.data)) !== null);
}

export async function deleteLead(id: string): Promise<ActionResult> {
  return run(id, async () => (await leadRepository()).remove(id));
}
