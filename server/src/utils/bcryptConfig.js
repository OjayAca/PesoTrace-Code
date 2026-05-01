/**
 * Bcrypt work factor. Tune via BCRYPT_ROUNDS (10–15). Production defaults to 12.
 */
export function getBcryptRounds(env = process.env) {
  const raw = Number(env.BCRYPT_ROUNDS);
  if (Number.isFinite(raw) && raw >= 10 && raw <= 15) {
    return raw;
  }

  return env.NODE_ENV === "production" ? 12 : 10;
}
