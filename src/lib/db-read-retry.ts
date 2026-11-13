const transientCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ETIMEDOUT",
  "08000",
  "08003",
  "08006",
  "53300",
  "57P01",
  "57P02",
  "57P03",
]);

function databaseCause(error: unknown): { code?: string; message?: string } {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== "object") break;
    const value = current as { cause?: unknown; code?: unknown; message?: unknown };
    if (!value.cause) return {
      code: typeof value.code === "string" ? value.code : undefined,
      message: depth > 0 && typeof value.message === "string" ? value.message : undefined,
    };
    current = value.cause;
  }
  return {};
}

export function isTransientDatabaseReadError(error: unknown) {
  const cause = databaseCause(error);
  return Boolean(
    (cause.code && transientCodes.has(cause.code)) ||
    (cause.message && /^(?:Connection terminated|Connection ended|timeout exceeded when trying to connect)/i.test(cause.message)),
  );
}

/** Retry an idempotent read once after a broken or temporarily unavailable DB connection. */
export async function retryTransientDatabaseRead<T>(label: string, read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    const cause = databaseCause(error);
    // Keep SQL parameters and session tokens out of the log.
    console.error(`${label} database read failed`, { code: cause.code, message: cause.message });
    if (!isTransientDatabaseReadError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      return await read();
    } catch (retryError) {
      const retryCause = databaseCause(retryError);
      console.error(`${label} database read retry failed`, { code: retryCause.code, message: retryCause.message });
      throw retryError;
    }
  }
}
