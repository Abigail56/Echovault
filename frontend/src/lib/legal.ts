/**
 * Version of the legal documents shown on the site. Must equal
 * CURRENT_TERMS_VERSION in backend/app/core/legal.py; the backend rejects
 * sign-ups that accepted a different version.
 */
export const TERMS_VERSION = "2026-10-29";
export const LEGAL_LAST_UPDATED = "29 October 2026";

/**
 * Business details that must be filled in before a public launch. They are
 * shown as visible placeholders rather than invented.
 */
export const OPERATOR = {
  name: "[Operator or company name]",
  address: "[Registered address]",
  contactEmail: "[Contact email address]",
  privacyEmail: "[Privacy contact email address]",
  jurisdiction: "[Governing law jurisdiction]",
} as const;
