// Main entry point for @safe-mongo/core
export { Client } from './client/index.js';
export { Model, type ModelOptions } from './model/index.js';

// Export adapter interface
export type { Adapter, InferInput, InferOutput } from './adapters/base.js';

// Export types
export type {
  PaprFilter,
  PaprUpdateFilter,
  PaprProjection,
  WithId,
  OptionalId,
  StrictOptionalId,
  StandardSchemaV1,
  InferStandardInput,
  InferStandardOutput,
} from './types/index.js';

export { isStandardSchemaV1 } from './types/index.js';

// Export utility functions
export {
  stringToObjectId,
  objectIdToString,
  isValidObjectId,
} from './utils/objectid.js';