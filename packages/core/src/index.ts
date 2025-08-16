// Main entry point for @safe-mongo/core
export { Client } from './client/index.js';
export { Model } from './model/index.js';

// Export adapter interface
export type { Adapter, InferInput, InferOutput, Result } from './adapters/base.js';

// Export types
export type {
  PaprUpdateFilter,
  PaprProjection,
  WithId,
  StrictOptionalId,
  StandardSchemaV1,
  InferStandardInput,
  InferStandardOutput,
  DocumentForInsert,
} from './types/index.js';

export { isStandardSchemaV1 } from './types/index.js';

// Export utility functions
export {
  stringToObjectId,
  objectIdToString,
  isValidObjectId,
} from './utils/objectid.js';