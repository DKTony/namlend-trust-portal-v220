import { ConvexError } from 'convex/values';

/** Per-field messages from a Convex VALIDATION_ERROR (`data.fields`). */
export function convexErrorFields(error: unknown): Record<string, string> {
  if (error instanceof ConvexError) {
    const fields = (error.data as { fields?: unknown } | undefined)?.fields;
    if (fields && typeof fields === 'object' && !Array.isArray(fields))
      return fields as Record<string, string>;
  }
  return {};
}

/** Readiness blockers from a Convex NOT_READY error (`data.issues`). */
export function convexErrorIssues(error: unknown): string[] {
  if (error instanceof ConvexError) {
    const issues = (error.data as { issues?: unknown } | undefined)?.issues;
    if (Array.isArray(issues)) return issues.map(String);
  }
  return [];
}
