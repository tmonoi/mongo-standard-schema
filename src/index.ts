// Main entry point for mongo-standard-schema
export { Client } from './client/index.js';
export type { SchemaAdapter } from './adapters/index.js';
export { ZodAdapter } from './adapters/zod.js';

// Re-export types
export type {
  PaprFilter,
  PaprUpdateFilter,
  PaprProjection,
  WithId,
  OptionalId,
} from './types/index.js';
