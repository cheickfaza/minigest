import { NextResponse } from "next/server";

import { toCsv } from "@/lib/csv";
import { requireAdmin, UnauthorizedError } from "@/server/auth/guard";
import { leadRepository } from "@/server/leads";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const repo = await leadRepository();
  const rows = await repo.all();

  const headers = [
    "id",
    "full_name",
    "email",
    "phone",
    "company",
    "message",
    "locale",
    "contacted",
    "contacted_at",
    "contacted_by",
    "admin_note",
    "consent_at",
    "created_at",
  ] as const;

  const csv = toCsv(
    headers,
    rows.map((r) => [
      r.id,
      r.fullName,
      r.email,
      r.phone ?? "",
      r.company ?? "",
      r.message ?? "",
      r.locale,
      r.contacted ? "true" : "false",
      r.contactedAt ?? "",
      r.contactedBy ?? "",
      r.adminNote ?? "",
      r.consentAt,
      r.createdAt,
    ]),
  );

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="minigest-leads-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
