import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  options = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_LENGTH,
      { ...options, maxmem: SCRYPT_MAX_MEMORY },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string) {
  if (password.length < 6 || password.length > 128) {
    throw new Error("Password must contain 6 to 128 characters.");
  }
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string | null | undefined,
) {
  const parts = encodedHash?.split("$") ?? [];
  const validFormat =
    parts.length === 6 &&
    parts[0] === "scrypt" &&
    Number(parts[1]) === SCRYPT_N &&
    Number(parts[2]) === SCRYPT_R &&
    Number(parts[3]) === SCRYPT_P;

  // Invalid and unknown accounts still perform scrypt work to reduce timing leaks.
  const salt = validFormat ? Buffer.from(parts[4], "base64url") : Buffer.alloc(16);
  const expected = validFormat
    ? Buffer.from(parts[5], "base64url")
    : Buffer.alloc(KEY_LENGTH);
  const actual = await deriveKey(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
