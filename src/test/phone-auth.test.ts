import { describe, expect, it } from "vitest";
import { isSixDigitPin, normalizePhoneNumber, phoneToAuthEmail } from "../lib/phone-auth";
import { getFarmerProfileCompletion, farmerProfileFields } from "../lib/farmer-profile";

describe("phone-based email aliases", () => {
  it("normalizes local and international Zimbabwean numbers to one alias", () => {
    expect(phoneToAuthEmail("077 123 4567")).toBe("263771234567@phone.auth.invalid");
    expect(phoneToAuthEmail("+263 77 123 4567")).toBe("263771234567@phone.auth.invalid");
  });

  it("accepts only six digit PINs", () => {
    expect(isSixDigitPin("123456")).toBe(true);
    expect(isSixDigitPin("12345")).toBe(false);
    expect(isSixDigitPin("12a456")).toBe(false);
  });

  it("rejects phone numbers that cannot be normalized", () => {
    expect(() => normalizePhoneNumber("123")).toThrow("Enter a valid mobile number");
  });
});

describe("farmer profile completion", () => {
  it("calculates completion from non-empty registration fields", () => {
    const empty = Object.fromEntries(farmerProfileFields.map((field) => [field, ""])) as Record<
      (typeof farmerProfileFields)[number],
      string
    >;
    expect(getFarmerProfileCompletion(empty)).toBe(0);
    expect(getFarmerProfileCompletion({ ...empty, firstName: "Ama" })).toBe(9);
    expect(getFarmerProfileCompletion({ ...empty, firstName: "Ama", surname: "Moyo" })).toBe(18);
  });
});
