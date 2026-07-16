import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ENCRYPTED_PREFIX = "enc:v1";

function encryptionKey() {
  const configured = process.env.BACKUP_CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!configured) {
    throw new Error("Backup credential encryption is not configured.");
  }

  const key = Buffer.from(configured, "base64url");
  if (key.length !== 32) {
    throw new Error("Backup credential encryption key must contain 32 bytes.");
  }
  return key;
}

export function encryptBackupCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    ENCRYPTED_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptBackupCredential(value: string | null) {
  if (!value) return "";
  if (!value.startsWith(`${ENCRYPTED_PREFIX}:`)) return value;

  const [, , ivValue, tagValue, encryptedValue] = value.split(":");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored backup credential is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isEncryptedBackupCredential(value: string | null) {
  return Boolean(value?.startsWith(`${ENCRYPTED_PREFIX}:`));
}
