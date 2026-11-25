import { describe, expect, it } from "vitest";

import { createLeadSchema, fieldErrors } from "@/lib/validation";

const valid = {
  fullName: "  Awa Diallo ",
  email: " Awa.Diallo@Example.COM ",
  phone: "06 12 34 56 78",
  company: "",
  message: "Bonjour",
  consent: true,
};

describe("lead validation", () => {
  it("normalises a valid submission", () => {
    const result = createLeadSchema("fr").parse(valid);
    expect(result).toEqual({
      fullName: "Awa Diallo",
      email: "awa.diallo@example.com",
      phone: "+33612345678",
      company: null,
      message: "Bonjour",
      consent: true,
    });
  });

  it("accepts an empty optional phone", () => {
    expect(createLeadSchema().parse({ ...valid, phone: "" }).phone).toBeNull();
  });

  it("accepts international numbers whatever the locale", () => {
    expect(createLeadSchema("en").parse({ ...valid, phone: "+225 07 07 07 07 07" }).phone).toBe("+2250707070707");
    expect(createLeadSchema("fr").parse({ ...valid, phone: "0044 20 7946 0958" }).phone).toBe("+442079460958");
  });

  it("reports i18n keys for each invalid field", () => {
    const result = createLeadSchema().safeParse({
      fullName: "A",
      email: "not-an-email",
      phone: "123",
      consent: false,
    });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({
      fullName: "fullNameTooShort",
      email: "emailInvalid",
      phone: "phoneInvalid",
      consent: "consentRequired",
    });
  });

  it("rejects overly long messages", () => {
    const result = createLeadSchema().safeParse({ ...valid, message: "x".repeat(1001) });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).message).toBe("tooLong");
  });
});
