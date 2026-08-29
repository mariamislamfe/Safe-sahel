import type { UserRoleEnum } from "./supabase-generated";

/**
 * Hand-written domain types that aren't 1:1 with a database row (e.g. enums
 * shared across UI and validation before/beyond what's in the DB schema).
 * Expand this as real features land — kept minimal in Phase 0.
 */
export type UserRole = UserRoleEnum;

export type Locale = "en" | "ar";
