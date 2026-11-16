import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { UserError } from "@/lib/credits";
import { firstIssue, type ActionState } from "@/lib/validation";

/**
 * Runs a Server Action body and turns expected failures into a friendly
 * ActionState. Navigation (redirect/notFound) is re-thrown so it still works.
 */
export async function runAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    const result = await fn();
    revalidatePath("/", "layout");
    return result ?? { success: "Saved." };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof UserError) return { error: err.message };
    if (err instanceof z.ZodError) return { error: firstIssue(err) };
    if (isUniqueViolation(err)) return { error: "That email address is already used by another customer." };
    console.error(err);
    return { error: "Something went wrong. Please try again." };
  }
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}
