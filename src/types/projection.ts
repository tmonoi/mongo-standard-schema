import type { WithId, NestedPaths } from './utils.js';

/**
 * MongoDB projection operators
 */
export interface PaprProjectionOperators {
  $slice?: number | [number, number];
  $elemMatch?: Record<string, unknown>;
  $meta?: 'textScore' | 'indexKey';
}

/**
 * MongoDB projection type
 */
export type PaprProjection<TSchema> = {
  [K in keyof WithId<TSchema> | NestedPaths<WithId<TSchema>>]?:
    | 0
    | 1
    | boolean
    | PaprProjectionOperators;
} & {
  _id?: 0 | 1 | boolean;
};

/**
 * Result type after projection is applied
 */
export type ProjectionResult<TSchema, TProjection> = TProjection extends Record<string, unknown>
  ? {
      [K in keyof WithId<TSchema>]: K extends keyof TProjection
        ? TProjection[K] extends 0 | false
          ? never
          : WithId<TSchema>[K]
        : TProjection extends Record<string, 1 | true>
        ? never
        : WithId<TSchema>[K];
    }
  : WithId<TSchema>;
