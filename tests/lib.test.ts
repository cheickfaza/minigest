import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "@/lib/csv";
import { formatPhone, toE164 } from "@/lib/phone";
import { createRateLimiter } from "@/lib/rate-limit";
import { initials } from "@/lib/utils";

describe("csv", () => {
  it("quotes cells containing separators, quotes or new lines (RFC 4180)", () => {
    expect(csvCell('Say "hi", ok')).toBe('"Say ""hi"", ok"');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell(null)).toBe("");
  });

  it("neutralises spreadsheet formula injection (OWASP)", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+33612345678")).toBe("'+33612345678");
  });

  it("serialises dates as ISO 8601 and prefixes a UTF-8 BOM", () => {
    const out = toCsv(["a", "b"], [[new Date("2026-01-02T03:04:05Z"), "é"]]);
    expect(out).toBe("\uFEFFa,b\r\n2026-01-02T03:04:05.000Z,é\r\n");
  });
});

describe("phone", () => {
  it("converts to E.164 and back to international display", () => {
    expect(toE164("06 12 34 56 78", "FR")).toBe("+33612345678");
    expect(toE164("not a phone")).toBeNull();
    expect(formatPhone("+33612345678")).toBe("+33 6 12 34 56 78");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and resets after the window", () => {
    let t = 0;
    const limiter = createRateLimiter(2, 1000, () => t);
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(false);
    expect(limiter.check("other")).toBe(true);
    t = 1000;
    expect(limiter.check("ip")).toBe(true);
  });
});

describe("initials", () => {
  it("returns up to two upper-case letters", () => {
    expect(initials("ada lovelace")).toBe("AL");
    expect(initials("Cher")).toBe("C");
    expect(initials("  ")).toBe("?");
  });
});
