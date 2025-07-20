import type { ObjectId } from 'mongodb';

/**
 * Adds _id field to a schema type
 */
export type WithId<TSchema> = TSchema & { _id: string };

/**
 * Makes _id field optional for insert operations
 */
export type OptionalId<TSchema> = Omit<TSchema, '_id'> & { _id?: string };

/**
 * Numeric types for MongoDB operations
 */
export type NumericType = number | bigint;

/**
 * MongoDB ObjectId or string representation
 */
export type ObjectIdLike = ObjectId | string;

/**
 * Utility type to get nested property paths
 */
export type NestedPaths<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? K extends string
          ? `${K}` | `${K}.${NestedPaths<T[K]>}`
          : never
        : K extends string
        ? `${K}`
        : never;
    }[keyof T]
  : never;

/**
 * Utility type to get the type of a nested property
 */
export type NestedPropertyType<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? NestedPropertyType<T[K], Rest>
    : never
  : never;

/**
 * Flatten nested object types for dot notation
 */
export type FlattenObject<T> = {
  [K in NestedPaths<T>]: NestedPropertyType<T, K>;
};
