import { HttpError } from "../middleware/errorHandler.js";

/** Strips non-digits; requires exactly 10 digits (stored as BIGINT in DB). */
export function parseTenDigitPhone(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) {
    throw new HttpError(400, "phone_number must be exactly 10 digits");
  }
  const n = Number(digits);
  if (n < 1_000_000_000 || n > 9_999_999_999) {
    throw new HttpError(400, "phone_number must be exactly 10 digits");
  }
  return n;
}
