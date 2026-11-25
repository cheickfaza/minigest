import "server-only";

import { getDb } from "../db/client";
import { createLeadRepository, type LeadRepository } from "./repository";

export async function leadRepository(): Promise<LeadRepository> {
  return createLeadRepository(await getDb());
}
