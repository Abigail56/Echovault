/**
 * Version of the legal documents shown on the site. Must equal
 * CURRENT_TERMS_VERSION in backend/app/core/legal.py; the backend rejects
 * sign-ups that accepted a different version.
 */
export const TERMS_VERSION = "2026-10-29";
export const LEGAL_LAST_UPDATED = "29 October 2026";

/**
 * Business details shown on the legal and contact pages. Set them in
 * frontend/.env.local (see .env.example); until then they appear as visible
 * [placeholders] rather than invented values. NEXT_PUBLIC_ values are read
 * when the app is built or the dev server starts.
 */
const setting = (value: string | undefined, placeholder: string) => value?.trim() || placeholder;

export const OPERATOR = {
  name: setting(process.env.NEXT_PUBLIC_OPERATOR_NAME, "[Operator or company name]"),
  address: setting(process.env.NEXT_PUBLIC_OPERATOR_ADDRESS, "[Registered address]"),
  contactEmail: setting(process.env.NEXT_PUBLIC_CONTACT_EMAIL, "[Contact email address]"),
  privacyEmail: setting(process.env.NEXT_PUBLIC_PRIVACY_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL, "[Privacy contact email address]"),
  jurisdiction: setting(process.env.NEXT_PUBLIC_GOVERNING_LAW, "[Governing law jurisdiction]"),
} as const;

export function isPlaceholder(value: string): boolean {
  return value.startsWith("[");
}
