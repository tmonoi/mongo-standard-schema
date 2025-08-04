// Main entry point for mongo-standard-schema
export { Client } from './client/index.js';
export type { SchemaAdapter, AdapterFactory, InferInput, InferOutput } from './adapters/index.js';
export {
  ZodAdapter,
  zodAdapter,
  zodAdapterFactory,
  ValibotAdapter,
  valibotAdapter,
  valibotAdapterFactory
} from './adapters/index.js';
export type { ModelOptions } from './model/index.js';

// Re-export types
export type {
  PaprFilter,
  PaprUpdateFilter,
  PaprProjection,
  WithId,
  OptionalId,
} from './types/index.js';
