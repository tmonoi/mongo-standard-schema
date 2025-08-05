// Main entry point for safe-mongo
export { Client } from './client/index.js';
export type { Adapter, InferInput, InferOutput } from './adapters/index.js';
export {
  ZodSchemaAdapter,
  zodAdapter,
  ValibotSchemaAdapter,
  valibotAdapter
} from './adapters/index.js';
export type { ModelOptions } from './model/index.js';
export type { StandardSchemaV1 } from './types/standard-schema.js';

// Re-export types
export type {
  PaprFilter,
  PaprUpdateFilter,
  PaprProjection,
  WithId,
  OptionalId,
} from './types/index.js';
