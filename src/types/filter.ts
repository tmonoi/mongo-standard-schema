import type { FlattenObject, WithId } from './utils.js';

/**
 * MongoDB comparison operators
 */
export interface PaprFilterConditions<T> {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $exists?: boolean;
  $type?: string | number;
  $regex?: RegExp | string;
  $options?: string;
  $size?: number;
  $all?: T extends readonly unknown[] ? T : never;
  $elemMatch?: T extends readonly unknown[] ? PaprFilter<T[number]> : never;
}

/**
 * MongoDB logical operators
 */
export interface PaprRootFilterOperators<T> {
  $and?: PaprFilter<T>[];
  $or?: PaprFilter<T>[];
  $nor?: PaprFilter<T>[];
  $not?: PaprFilter<T>;
}

/**
 * MongoDB array operators
 */
export interface PaprArrayFilterOperators<T> {
  $?: PaprFilter<T>;
  '$[]'?: PaprFilter<T>;
}

/**
 * Strict field filter that only allows existing fields
 */
export type StrictFieldFilter<TSchema> = {
  [K in keyof WithId<TSchema>]?:
    | WithId<TSchema>[K]
    | PaprFilterConditions<WithId<TSchema>[K]>;
};

/**
 * Main filter type that combines all MongoDB filter operations
 * This version is more strict and only allows existing fields
 */
export type PaprFilter<TSchema> = StrictFieldFilter<TSchema> & PaprRootFilterOperators<WithId<TSchema>>;

/**
 * Filter type for array elements
 */
export type PaprArrayFilter<TSchema> = {
  [K in keyof WithId<TSchema>]?: WithId<TSchema>[K] extends readonly unknown[]
    ? PaprArrayFilterOperators<WithId<TSchema>[K][number]>
    : never;
};
