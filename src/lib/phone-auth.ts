const PHONE_ALIAS_DOMAIN = "phone.auth.invalid";

export function normalizePhoneNumber(input: string): string {
  const compact = input.trim().replace(/[\s()-]/g, "");

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  const digits = compact.replace(/\D/g, "");
  if (/^263\d{9}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^0\d{9}$/.test(digits)) {
    return `+263${digits.slice(1)}`;
  }

  throw new Error("Enter a valid mobile number, such as +263 77 123 4567.");
}

export function phoneToAuthEmail(phone: string): string {
  return `${normalizePhoneNumber(phone).slice(1)}@${PHONE_ALIAS_DOMAIN}`;
}

export function isSixDigitPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
