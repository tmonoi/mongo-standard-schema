import type { ObjectId, OptionalId, WithId } from "mongodb";

export type { WithId };

/**
 * Strict version that requires all non-_id fields to be present
 * _id is optional only for ObjectId type, required for string type
 */
export type StrictOptionalId<TSchema> = TSchema extends { _id: ObjectId }
  ? Omit<TSchema, "_id"> & { _id?: ObjectId }
  : TSchema extends { _id: string }
  ? TSchema // string _id is required
  : TSchema & { _id?: string };

/**
 * Extract the _id type from a schema
 */
export type ExtractIdType<TSchema> = TSchema extends { _id: infer IdType }
  ? IdType
  : string;

/**
 * Check if a schema has ObjectId as _id type
 */
export type HasObjectId<TSchema> = TSchema extends { _id: ObjectId }
  ? true
  : false;

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

/**
 * Recursively converts fields named `_id` from `string` to `ObjectId`.
 * This is used to create a type that is compatible with the MongoDB driver's filters.
 */
export type WithMongoId<T> = T extends (infer U)[]
  ? WithMongoId<U>[]
  : T extends Date
  ? T
  : T extends object
  ? {
      [K in keyof T]: K extends "_id"
        ? ObjectId
        : T[K] extends (infer V)[]
        ? WithMongoId<V>[]
        : T[K] extends object
        ? WithMongoId<T[K]>
        : T[K];
    }
  : T;

export type DocumentForInsert<TSchema> = OptionalIdIfObjectId<TSchema>;

export type OptionalIdIfObjectId<TSchema> =
TSchema extends { _id: infer I }
  ? I extends ObjectId
    ? Omit<TSchema, '_id'> & { _id?: I }
    : TSchema
  : TSchema;
