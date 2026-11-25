/**
 * Inserts realistic sample leads for local testing.
 * Safe to run multiple times (duplicates are ignored by unique email index).
 */
import "dotenv/config";

import { createDatabase } from "../src/server/db/factory";
import { leads } from "../src/server/db/schema";

const dayMs = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * dayMs);

async function main() {
  const db = await createDatabase({ url: process.env.DATABASE_URL, migrateLocal: true });

  const samples = [
    {
      fullName: "Awa Diallo",
      email: "awa.diallo@horizon-conseil.fr",
      phone: "+33612345678",
      company: "Horizon Conseil",
      message: "Bonjour, nous souhaitons équiper notre équipe commerciale (12 personnes) d'un outil de suivi simple.",
      locale: "fr",
      consentAt: daysAgo(0),
      createdAt: daysAgo(0),
      contacted: false,
    },
    {
      fullName: "Marcus Chen",
      email: "m.chen@northstar-labs.io",
      phone: "+12025550143",
      company: "Northstar Labs",
      message: "Looking for a lightweight lead follow-up workflow with GDPR compliance and CSV export.",
      locale: "en",
      consentAt: daysAgo(1),
      createdAt: daysAgo(1),
      contacted: false,
    },
    {
      fullName: "Koffi Mensah",
      email: "koffi.mensah@abidjan-tech.ci",
      phone: "+2250707070707",
      company: "Abidjan Tech",
      message: "Intéressé par une démonstration cette semaine.",
      locale: "fr",
      consentAt: daysAgo(2),
      createdAt: daysAgo(2),
      contacted: true,
      contactedAt: daysAgo(1),
      contactedBy: process.env.ADMIN_EMAIL || "admin@minigest.local",
      adminNote: "Appel effectué, démo planifiée jeudi à 15h UTC.",
    },
    {
      fullName: "Clara Lindqvist",
      email: "clara@nordicstudio.se",
      phone: "+46701234567",
      company: "Nordic Studio",
      message: "Can we deploy on our own Vercel + Neon account?",
      locale: "en",
      consentAt: daysAgo(4),
      createdAt: daysAgo(4),
      contacted: true,
      contactedAt: daysAgo(3),
      contactedBy: process.env.ADMIN_EMAIL || "admin@minigest.local",
      adminNote: "Sent deployment docs by email.",
    },
    {
      fullName: "Youssef Benali",
      email: "y.benali@atlas-logistique.ma",
      phone: "+212612345678",
      company: "Atlas Logistique",
      message: "Besoin d'un devis pour une intégration sur mesure.",
      locale: "fr",
      consentAt: daysAgo(6),
      createdAt: daysAgo(6),
      contacted: false,
    },
  ];

  await db.insert(leads).values(samples).onConflictDoNothing();
  console.log(`✓ Seed complete (${samples.length} sample leads ensured).`);
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
