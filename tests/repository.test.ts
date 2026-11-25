import { beforeEach, describe, expect, it } from "vitest";

import { createLeadSchema } from "@/lib/validation";
import { createDatabase, type Database } from "@/server/db/factory";
import { leads } from "@/server/db/schema";
import { createLeadRepository, type LeadRepository } from "@/server/leads/repository";

/** Integration tests against a real Postgres engine (PGlite, in memory) with the real migrations. */
let db: Database;
let repo: LeadRepository;

const input = (name: string, email: string, extra: Record<string, unknown> = {}) =>
  createLeadSchema().parse({ fullName: name, email, consent: true, ...extra });

beforeEach(async () => {
  db = await createDatabase({ localDir: "memory://", migrateLocal: true });
  repo = createLeadRepository(db);
});

describe("lead repository", () => {
  it("creates a lead and ignores duplicate e-mails case-insensitively", async () => {
    await expect(repo.create(input("Awa Diallo", "awa@example.com"), "fr")).resolves.toEqual({ created: true });
    await expect(repo.create(input("Awa D.", "AWA@example.com"), "en")).resolves.toEqual({ created: false });

    const page = await repo.list();
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ fullName: "Awa Diallo", email: "awa@example.com", contacted: false, locale: "fr" });
    expect(page.items[0]?.consentAt).toBeInstanceOf(Date);
  });

  it("searches, filters, sorts and paginates", async () => {
    await repo.create(input("Charles Babbage", "charles@example.com", { company: "Analytical Ltd" }), "en");
    await repo.create(input("Ada Lovelace", "ada@example.com"), "en");
    await repo.create(input("Grace Hopper", "grace@navy.mil"), "en");
    const grace = (await repo.list({ q: "grace" })).items[0]!;
    await repo.setContacted(grace.id, true, "admin@example.com");

    expect((await repo.list({ q: "analytical" })).items.map((l) => l.fullName)).toEqual(["Charles Babbage"]);
    expect((await repo.list({ q: "100%" })).total).toBe(0);
    expect((await repo.list({ status: "contacted" })).items.map((l) => l.fullName)).toEqual(["Grace Hopper"]);
    expect((await repo.list({ status: "pending" })).total).toBe(2);
    expect((await repo.list({ sort: "name" })).items.map((l) => l.fullName)).toEqual([
      "Ada Lovelace",
      "Charles Babbage",
      "Grace Hopper",
    ]);

    const page2 = await repo.list({ sort: "name", page: 2, pageSize: 2 });
    expect(page2).toMatchObject({ total: 3, page: 2, pageCount: 2 });
    expect(page2.items.map((l) => l.fullName)).toEqual(["Grace Hopper"]);
    expect((await repo.list({ page: 99, pageSize: 2 })).page).toBe(2);
  });

  it("records who marked a lead as contacted, and clears it when unticked", async () => {
    await repo.create(input("Alan Turing", "alan@example.com"), "en");
    const { id } = (await repo.list()).items[0]!;

    const contacted = await repo.setContacted(id, true, "admin@example.com");
    expect(contacted).toMatchObject({ contacted: true, contactedBy: "admin@example.com" });
    expect(contacted?.contactedAt).toBeInstanceOf(Date);

    const reverted = await repo.setContacted(id, false, "admin@example.com");
    expect(reverted).toMatchObject({ contacted: false, contactedBy: null, contactedAt: null });
  });

  it("updates the internal note and deletes", async () => {
    await repo.create(input("Linus T", "linus@example.com"), "en");
    const { id } = (await repo.list()).items[0]!;

    expect((await repo.updateNote(id, "Call back Monday"))?.adminNote).toBe("Call back Monday");
    expect((await repo.updateNote(id, ""))?.adminNote).toBeNull();
    await expect(repo.remove(id)).resolves.toBe(true);
    await expect(repo.findById(id)).resolves.toBeNull();
    await expect(repo.remove(id)).resolves.toBe(false);
  });

  it("computes dashboard statistics per UTC day", async () => {
    const now = new Date("2026-03-15T12:00:00Z");
    await db.insert(leads).values([
      { fullName: "A A", email: "a@x.io", consentAt: now, createdAt: new Date("2026-03-15T08:00:00Z"), contacted: true },
      { fullName: "B B", email: "b@x.io", consentAt: now, createdAt: new Date("2026-03-15T09:00:00Z") },
      { fullName: "C C", email: "c@x.io", consentAt: now, createdAt: new Date("2026-03-10T09:00:00Z") },
      { fullName: "D D", email: "d@x.io", consentAt: now, createdAt: new Date("2026-01-01T09:00:00Z") },
    ]);

    const stats = await repo.stats(now);
    expect(stats).toMatchObject({ total: 4, contacted: 1, pending: 3, last7Days: 3 });
    expect(stats.daily).toHaveLength(14);
    expect(stats.daily.at(0)?.date).toBe("2026-03-02");
    expect(stats.daily.at(-1)).toEqual({ date: "2026-03-15", count: 2 });
    expect(stats.daily.find((d) => d.date === "2026-03-10")?.count).toBe(1);
  });
});
