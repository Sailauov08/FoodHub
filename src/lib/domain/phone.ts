/**
 * Kazakhstan mobile numbers: +7 7XX XXX XX XX (country code 7, mobile prefixes start with 7).
 * Accepts "+7 701 234 56 78", "87012345678", "7012345678" etc. Returns E.164 "+77012345678" or null.
 */
export function normalizeKzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national: string;
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) national = digits.slice(1);
  else if (digits.length === 10) national = digits;
  else return null;
  // Mobile operator codes (Kcell/Activ 70x/77x, Beeline 70x/77x, Tele2/Altel 707/747/708, data 750–764).
  // Landline area codes such as 727 (Almaty) or 717 (Astana) are rejected.
  if (!/^7(0\d|47|5[01]|6[0-4]|7[1-8])\d{7}$/.test(national)) return null;
  return `+7${national}`;
}

export function formatKzPhone(e164: string): string {
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+7 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}
