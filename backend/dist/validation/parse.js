import { ZodError } from "zod";
export function parseBody(schema, body) {
    const result = schema.safeParse(body);
    if (!result.success) {
        const msg = result.error.issues
            .map((e) => e.message)
            .join(", ");
        throw new Error(msg);
    }
    return result.data;
}
