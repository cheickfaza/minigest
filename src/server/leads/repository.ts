import { and, asc, count, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";

import type { LeadInput } from "@/lib/validation";

import type { Database } from "../db/factory";
import { leads, type Lead } from "../db/schema";

export type LeadStatusFilter = "all" | "pending" | "contacted";
export type LeadSort = "newest" | "oldest" | "name";

export interface ListLeadsQuery {
  q?: string;
  status?: LeadStatusFilter;
  sort?: LeadSort;
  page?: number;
  pageSize?: number;
}

export interface LeadPage {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface LeadStats {
  total: number;
  contacted: number;
  pending: number;
  last7Days: number;
  /** One entry per UTC day, oldest first. */
  daily: { date: string; count: number }[];
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Data-access layer for leads. Receives the database so it can be tested against an in-memory Postgres. */
export function createLeadRepository(db: Database) {
  function whereFor(query: ListLeadsQuery): SQL | undefined {
    const conditions: SQL[] = [];
    const q = query.q?.trim();
    if (q) {
      const pattern = `%${escapeLike(q)}%`;
      conditions.push(
        or(ilike(leads.fullName, pattern), ilike(leads.email, pattern), ilike(leads.company, pattern))!,
      );
    }
    if (query.status === "pending") conditions.push(eq(leads.contacted, false));
    if (query.status === "contacted") conditions.push(eq(leads.contacted, true));
    return conditions.length ? and(...conditions) : undefined;
  }

  return {
    /**
     * Stores a new lead. If the e-mail already exists the call is a no-op
     * (`created: false`); callers must not reveal this to the public, to avoid
     * leaking which addresses are already registered.
     */
    async create(input: LeadInput, locale: string, now = new Date()): Promise<{ created: boolean }> {
      const rows = await db
        .insert(leads)
        .values({
          fullName: input.fullName,
          email: input.email.toLowerCase(),
          phone: input.phone,
          company: input.company,
          message: input.message,
          locale,
          consentAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: leads.id });
      return { created: rows.length > 0 };
    },

    async list(query: ListLeadsQuery = {}): Promise<LeadPage> {
      const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
      const where = whereFor(query);

      const [totalRow] = await db.select({ value: count() }).from(leads).where(where);
      const total = Number(totalRow?.value ?? 0);
      const pageCount = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(Math.max(query.page ?? 1, 1), pageCount);

      const orderBy =
        query.sort === "oldest"
          ? [asc(leads.createdAt)]
          : query.sort === "name"
            ? [asc(sql`lower(${leads.fullName})`), desc(leads.createdAt)]
            : [desc(leads.createdAt)];

      const items = await db
        .select()
        .from(leads)
        .where(where)
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return { items, total, page, pageSize, pageCount };
    },

    async findById(id: string): Promise<Lead | null> {
      const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
      return row ?? null;
    },

    async setContacted(id: string, contacted: boolean, adminEmail: string): Promise<Lead | null> {
      const [row] = await db
        .update(leads)
        .set({
          contacted,
          contactedAt: contacted ? new Date() : null,
          contactedBy: contacted ? adminEmail : null,
        })
        .where(eq(leads.id, id))
        .returning();
      return row ?? null;
    },

    async updateNote(id: string, note: string): Promise<Lead | null> {
      const [row] = await db
        .update(leads)
        .set({ adminNote: note === "" ? null : note })
        .where(eq(leads.id, id))
        .returning();
      return row ?? null;
    },

    async remove(id: string): Promise<boolean> {
      const rows = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
      return rows.length > 0;
    },

    async stats(now = new Date(), days = 14): Promise<LeadStats> {
      const [totals] = await db
        .select({
          total: count(),
          contacted: sql<number>`count(*) filter (where ${leads.contacted})`,
        })
        .from(leads);

      const dayMs = 86_400_000;
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const since = new Date(todayUtc - (days - 1) * dayMs);
      const since7 = new Date(now.getTime() - 7 * dayMs);

      const dayExpr = sql<string>`to_char(${leads.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
      const perDay = await db
        .select({ date: dayExpr, value: count() })
        .from(leads)
        .where(gte(leads.createdAt, since))
        .groupBy(dayExpr);

      const [recent] = await db.select({ value: count() }).from(leads).where(gte(leads.createdAt, since7));

      const byDate = new Map(perDay.map((r) => [r.date, Number(r.value)]));
      const daily = Array.from({ length: days }, (_, i) => {
        const date = new Date(since.getTime() + i * dayMs).toISOString().slice(0, 10);
        return { date, count: byDate.get(date) ?? 0 };
      });

      const total = Number(totals?.total ?? 0);
      const contacted = Number(totals?.contacted ?? 0);
      return { total, contacted, pending: total - contacted, last7Days: Number(recent?.value ?? 0), daily };
    },

    async all(): Promise<Lead[]> {
      return db.select().from(leads).orderBy(desc(leads.createdAt));
    },
  };
}

export type LeadRepository = ReturnType<typeof createLeadRepository>;
