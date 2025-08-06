/**
 * Base interface for adapters
 * This allows support for multiple validation libraries (zod, valibot, arktype, etc.)
 */
export interface Adapter<TInput, TOutput = TInput> {
  /**
   * Parse data and throw on validation failure
   */
  parse(data: unknown): TOutput;

  /**
   * Parse data and return result object
   */
  safeParse(data: unknown): { success: true; data: TOutput } | { success: false; error: unknown };

  /**
   * Create a partial version of the schema (all fields optional)
   */
  partial(): Adapter<Partial<TInput>, Partial<TOutput>>;

  /**
   * Create an optional version of the schema (schema | undefined)
   */
  optional(): Adapter<TInput | undefined, TOutput | undefined>;

  /**
   * Get the original schema object
   */
  getSchema(): unknown;

  /**
   * Process update fields to apply defaults and validation
   * This is used for MongoDB update operations like $set
   */
  parseUpdateFields?(fields: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Type helper to extract input type from adapter
 */
export type InferInput<T> = T extends Adapter<infer U, unknown> ? U : never;

/**
 * Type helper to extract output type from adapter
 */
export type InferOutput<T> = T extends Adapter<unknown, infer U> ? U : never;