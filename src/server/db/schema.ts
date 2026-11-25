import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * A lead is a prospect who submitted the public contact form.
 * Only an authenticated administrator can mark a lead as contacted.
 */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: varchar("full_name", { length: 80 }).notNull(),
    /** Always stored lower-cased (normalised in the domain layer). */
    email: varchar("email", { length: 254 }).notNull(),
    /** E.164 format (e.g. +33612345678) or null. */
    phone: varchar("phone", { length: 20 }),
    company: varchar("company", { length: 120 }),
    message: text("message"),
    /** BCP 47 locale the visitor used when submitting (fr, en). */
    locale: varchar("locale", { length: 10 }).notNull().default("fr"),
    /** GDPR: explicit consent timestamp. */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),

    contacted: boolean("contacted").notNull().default(false),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    contactedBy: varchar("contacted_by", { length: 254 }),
    /** Internal note, visible to administrators only. */
    adminNote: text("admin_note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("leads_email_unique").on(sql`lower(${t.email})`),
    index("leads_created_at_idx").on(t.createdAt),
    index("leads_contacted_idx").on(t.contacted),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
