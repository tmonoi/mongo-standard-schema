import type { StandardSchemaV1 } from "@standard-schema/spec";

export class ValidationError extends Error {
  issues: readonly StandardSchemaV1.Issue[];

  constructor(message: string, issues: readonly StandardSchemaV1.Issue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
