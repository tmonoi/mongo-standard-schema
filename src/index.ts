// Main entry point for mongo-standard-schema
export { Client } from './client/index.js';
export type { Adapter, InferInput, InferOutput } from './adapters/index.js';
export { StandardSchemaAdapter } from './adapters/index.js';
export {
  ZodAdapter,
  ZodSchemaAdapter,
  zodAdapter,
  ValibotAdapter,
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
