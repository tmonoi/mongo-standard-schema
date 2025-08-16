import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { StrictOptionalId } from "../types/utils.js";

/**
 * Base interface for adapters
 * This allows support for multiple validation libraries (zod, valibot, arktype, etc.)
 */
export interface Adapter<TInput, TOutput = TInput> {
  /**
   * Parse data and throw on validation failure
   */
  validate(data: TInput): StandardSchemaV1.Result<TOutput>;

  /**
   * Validate data for insert operation
   * '_id' field is optional if '_id' is ObjectId
   */
  validateForInsert(
    data: StrictOptionalId<TInput>
  ): StandardSchemaV1.Result<StrictOptionalId<TOutput>>;

  /**
   * Process update fields to apply defaults and validation
   * This is used for MongoDB update operations like $set
   */
  parseUpdateFields?(fields: Record<string, unknown>): Record<string, unknown>;

  /**
   * Get the type of the _id field in the schema
   * Returns 'string' for string _id, 'ObjectId' for ObjectId _id, or 'none' if no _id field
   */
  getIdFieldType?(): "string" | "ObjectId" | "none";
}

export type Result<T> = StandardSchemaV1.Result<T>;

/**
 * Type helper to extract input type from adapter
 */
export type InferInput<T> = T extends Adapter<infer U, unknown> ? U : never;

/**
 * Type helper to extract output type from adapter
 */
export type InferOutput<T> = T extends Adapter<unknown, infer U> ? U : never;
