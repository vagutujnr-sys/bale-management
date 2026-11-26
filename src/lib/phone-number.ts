import { normalizePhoneNumber } from "@/lib/phone-auth";

export const phoneCountryCodes = [
  { code: "+263", country: "Zimbabwe", nationalDigits: 9 },
  { code: "+27", country: "South Africa", nationalDigits: 9 },
  { code: "+260", country: "Zambia", nationalDigits: 9 },
  { code: "+265", country: "Malawi", nationalDigits: 9 },
  { code: "+258", country: "Mozambique", nationalDigits: 9 },
  { code: "+267", country: "Botswana", nationalDigits: 8 },
] as const;

export function getInternationalPhone(countryCode: string, nationalNumber: string): string {
  const country = phoneCountryCodes.find((item) => item.code === countryCode);
  if (!country) throw new Error("Choose a valid country calling code.");

  const digits = nationalNumber.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length !== country.nationalDigits) {
    throw new Error(`Enter a ${country.nationalDigits}-digit mobile number without the leading 0.`);
  }
  return normalizePhoneNumber(`${country.code}${digits}`);
}
