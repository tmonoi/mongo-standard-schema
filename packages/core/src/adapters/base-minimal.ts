/**
 * Minimal interface for adapters
 * This allows support for multiple validation libraries (zod, valibot, arktype, etc.)
 */
export interface MinimalAdapter<TInput, TOutput = TInput> {
  /**
   * Parse data and throw on validation failure
   */
  parse(data: unknown): TOutput;

  /**
   * Process update fields to apply defaults and validation
   * This is used for MongoDB update operations like $set
   */
  parseUpdateFields?(fields: Record<string, unknown>): Record<string, unknown>;

  /**
   * Get the type of the _id field in the schema
   * Returns 'string' for string _id, 'ObjectId' for ObjectId _id, or 'none' if no _id field
   */
  getIdFieldType?(): 'string' | 'ObjectId' | 'none';
}

/**
 * Type helper to extract input type from adapter
 */
export type InferInput<T> = T extends MinimalAdapter<infer U, unknown> ? U : never;

/**
 * Type helper to extract output type from adapter
 */
export type InferOutput<T> = T extends MinimalAdapter<unknown, infer U> ? U : never;