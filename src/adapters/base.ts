/**
 * Base interface for schema adapters
 * This allows support for multiple validation libraries (zod, valibot, arktype, etc.)
 */
export interface SchemaAdapter<TInput, TOutput = TInput> {
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
  partial(): SchemaAdapter<Partial<TInput>, Partial<TOutput>>;

  /**
   * Create an optional version of the schema (schema | undefined)
   */
  optional(): SchemaAdapter<TInput | undefined, TOutput | undefined>;

  /**
   * Get the original schema object
   */
  getSchema(): unknown;
}

/**
 * Type helper to extract input type from schema adapter
 */
export type InferInput<T> = T extends SchemaAdapter<infer U, unknown> ? U : never;

/**
 * Type helper to extract output type from schema adapter
 */
export type InferOutput<T> = T extends SchemaAdapter<unknown, infer U> ? U : never;
