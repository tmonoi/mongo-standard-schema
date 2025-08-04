import type { StandardSchemaV1 } from '../types/standard-schema.js';
import type { Adapter } from './base.js';

/**
 * Base class for Standard Schema adapters
 * This class provides a bridge between Standard Schema and our Adapter interface
 */
export abstract class StandardSchemaAdapter {
  /**
   * Name of the adapter (e.g., 'zod', 'valibot')
   */
  abstract readonly name: string;

  /**
   * Check if a schema is supported by this adapter
   */
  abstract supports(schema: unknown): boolean;

  /**
   * Create an Adapter from a schema
   */
  abstract create(schema: unknown): Adapter<unknown, unknown>;
}