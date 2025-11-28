import type { ZodSchema } from "zod";
import { ZodError } from "zod";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues
      .map((e) => e.message)
      .join(", ");
    throw new Error(msg);
  }
  return result.data;
}
