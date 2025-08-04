import type { SchemaAdapter } from './base.js';

/**
 * Factory interface for creating schema adapters
 */
export interface AdapterFactory {
  /**
   * Create a schema adapter from a schema definition
   */
  create<TSchema>(schema: TSchema): SchemaAdapter<any, any>;
  
  /**
   * Name of the adapter factory (e.g., 'zod', 'valibot')
   */
  readonly name: string;
}