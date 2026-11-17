import { z } from "zod";

/** Egyptian mobile: 010/011/012/015 + 8 digits, with or without 0 / +20 / 0020. */
const EG_MOBILE = /^(?:\+?20|0020|0)?(1[0125]\d{8})$/;
/** International numbers for guests from abroad: + and 8–15 digits. */
const INTL = /^\+\d{8,15}$/;

/** Strip spaces, dashes, dots and brackets people type around numbers. */
const compact = (raw: string) =>
  raw
    .replace(/[\s\-().]/g, "")
    // Arabic-Indic digits typed on Arabic keyboards → ASCII.
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

export function isValidPhone(raw: string): boolean {
  const s = compact(raw);
  return EG_MOBILE.test(s) || INTL.test(s);
}

/** Canonical stored form: Egyptian numbers as 01XXXXXXXXX, others as +XXXXXXXX. */
export function normalizePhone(raw: string): string | null {
  const s = compact(raw);
  if (!s) return null;
  const eg = s.match(EG_MOBILE);
  if (eg) return `0${eg[1]}`;
  return INTL.test(s) ? s : null;
}

/** Error codes (translated in the UI): phone_required | phone_invalid. */
export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    role: z.enum(["guest", "owner"]),
    // Required for hosts (all booking coordination is on WhatsApp), optional for guests.
    phone: z.string().trim(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "terms_required" }) }),
  })
  .superRefine((v, ctx) => {
    if (!v.phone) {
      if (v.role === "owner")
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "phone_required" });
      return;
    }
    if (!isValidPhone(v.phone))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "phone_invalid" });
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type SignInInput = z.infer<typeof signInSchema>;
