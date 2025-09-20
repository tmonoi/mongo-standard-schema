/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-use-before-define */

import type {
  AlternativeType,
  ArrayElement,
  BitwiseFilter,
  BSONRegExp,
  BSONType,
  BSONTypeAlias,
  DeleteManyModel,
  DeleteOneModel,
  Document,
  IntegerType,
  Join,
  KeysOfAType,
  NumericType,
  OnlyFieldsOfType,
  PullAllOperator,
  PullOperator,
  PushOperator,
  ReplaceOneModel,
  SetFields,
  Timestamp,
  UpdateManyModel,
  UpdateOneModel,
  WithId,
  ObjectId,
} from 'mongodb';

// ============================================================================
// Basic Types and Utilities
// ============================================================================

export type { WithId };

/**
 * Property type extraction from dot notation path
 */
export type PropertyType<TSchema, Property extends string> = string extends Property
  ? unknown
  : Property extends keyof TSchema
  ? TSchema[Property]
  : Property extends `${infer Key}.${infer Rest}`
  ? Key extends keyof TSchema
    ? PropertyType<TSchema[Key], Rest>
    : unknown
  : unknown;

/**
 * Nested paths generation with depth limit
 */
export type NestedPaths<T, Depth extends number[]> = Depth['length'] extends 10
  ? never
  : T extends any[]
  ? never
  : T extends Date
  ? never
  : T extends ObjectId
  ? never
  : T extends object
  ? {
      [K in Extract<keyof T, string>]: T[K] extends any[]
        ? [K]
        : T[K] extends Date
        ? [K]
        : T[K] extends ObjectId
        ? [K]
        : T[K] extends object
        ? [K] | [K, ...NestedPaths<T[K], [...Depth, 1]>]
        : [K];
    }[Extract<keyof T, string>]
  : never;

// ============================================================================
// Document Types
// ============================================================================

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
 * Recursively converts fields named `_id` from `string` to `ObjectId`.
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

// ============================================================================
// Filter Types
// ============================================================================

export type PaprFilter<TSchema> =
  | Partial<WithId<TSchema>>
  | (PaprFilterConditions<WithId<TSchema>> & PaprRootFilterOperators<WithId<TSchema>>);

export type PaprFilterConditions<TSchema> = {
  [Property in Join<NestedPaths<TSchema, []>, '.'>]?: PaprCondition<
    PropertyType<TSchema, Property>
  >;
} & {
  [K in keyof TSchema]?: PaprCondition<TSchema[K]>;
};

export interface PaprRootFilterOperators<TSchema> {
  $and?: PaprFilter<TSchema>[];
  $nor?: PaprFilter<TSchema>[];
  $or?: PaprFilter<TSchema>[];
  $expr?: Record<string, any>;
  $text?: {
    $search: string;
    $language?: string;
    $caseSensitive?: boolean;
    $diacriticSensitive?: boolean;
  };
  $where?: string | ((this: TSchema) => boolean);
  $comment?: Document | string;
}

export type PaprCondition<Type> =
  | AlternativeType<Type>
  | PaprFilterOperators<AlternativeType<Type>>;

export interface PaprFilterOperators<TValue> {
  $eq?: TValue;
  $gt?: TValue;
  $gte?: TValue;
  $in?: readonly TValue[];
  $lt?: TValue;
  $lte?: TValue;
  $ne?: TValue;
  $nin?: readonly TValue[];
  $not?: TValue extends string ? PaprFilterOperators<TValue> | RegExp : PaprFilterOperators<TValue>;
  $exists?: boolean;
  $type?: BSONType | BSONTypeAlias;
  $expr?: Record<string, any>;
  $jsonSchema?: Record<string, any>;
  $mod?: TValue extends number ? [number, number] : never;
  $regex?: TValue extends string ? BSONRegExp | RegExp | string : never;
  $options?: TValue extends string ? string : never;
  $geoIntersects?: {
    $geometry: Document;
  };
  $geoWithin?: Document;
  $near?: Document;
  $nearSphere?: Document;
  $maxDistance?: number;
  $all?: TValue extends readonly any[] ? readonly any[] : never;
  $elemMatch?: TValue extends readonly any[] ? Document : never;
  $size?: TValue extends readonly any[] ? number : never;
  $bitsAllClear?: BitwiseFilter;
  $bitsAllSet?: BitwiseFilter;
  $bitsAnyClear?: BitwiseFilter;
  $bitsAnySet?: BitwiseFilter;
  $rand?: Record<string, never>;
}

// ============================================================================
// Update Types
// ============================================================================

/**
 * Returns all dot-notation properties of a schema with their corresponding types.
 */
export type PaprAllProperties<TSchema> = {
  [Property in Join<NestedPaths<TSchema, []>, '.'>]?: PropertyType<TSchema, Property>;
} & {
  [K in keyof TSchema]?: TSchema[K];
};

/**
 * Returns all array-specific element dot-notation properties
 */
export type PaprArrayElementsProperties<TSchema> = {
  [Property in `${Extract<KeysOfAType<PaprAllProperties<TSchema>, any[]>, string>}.$${
    | ''
    | `[${string}]`}`]?: ArrayElement<
    PropertyType<TSchema, Property extends `${infer Key}.$${string}` ? Key : never>
  >;
};

/**
 * Returns all array-specific nested dot-notation properties
 */
export type PaprArrayNestedProperties<TSchema> = {
  [Property in `${Extract<KeysOfAType<PaprAllProperties<TSchema>, Record<string, any>[]>, string>}.$${
    | ''
    | `[${string}]`}.${string}`]?: any;
};

/**
 * Match keys and values for update operations
 */
export type PaprMatchKeysAndValues<TSchema> = PaprAllProperties<TSchema> &
  PaprArrayElementsProperties<TSchema> &
  PaprArrayNestedProperties<TSchema>;

/**
 * MongoDB update filter
 */
export interface PaprUpdateFilter<TSchema> {
  $currentDate?: OnlyFieldsOfType<
    TSchema,
    Date | Timestamp,
    | true
    | {
        $type: 'date' | 'timestamp';
      }
  >;
  $inc?: OnlyFieldsOfType<TSchema, NumericType | undefined>;
  $min?: PaprMatchKeysAndValues<TSchema>;
  $max?: PaprMatchKeysAndValues<TSchema>;
  $mul?: OnlyFieldsOfType<TSchema, NumericType | undefined>;
  $rename?: Record<string, string>;
  $set?: PaprMatchKeysAndValues<TSchema>;
  $setOnInsert?: PaprMatchKeysAndValues<TSchema>;
  $unset?: OnlyFieldsOfType<TSchema, any, '' | 1 | true>;
  $addToSet?: SetFields<TSchema>;
  $pop?: OnlyFieldsOfType<TSchema, readonly any[], -1 | 1>;
  $pull?: PullOperator<TSchema>;
  $push?: PushOperator<TSchema>;
  $pullAll?: PullAllOperator<TSchema>;
  $bit?: OnlyFieldsOfType<
    TSchema,
    NumericType | undefined,
    | {
        and: IntegerType;
      }
    | {
        or: IntegerType;
      }
    | {
        xor: IntegerType;
      }
  >;
}

// ============================================================================
// Projection Types
// ============================================================================

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
  [K in keyof WithId<TSchema>]?:
    | 0
    | 1
    | boolean
    | PaprProjectionOperators;
} & {
  [key: string]: 0 | 1 | boolean | PaprProjectionOperators | undefined;
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

// ============================================================================
// Bulk Write Types
// ============================================================================

export type PaprBulkWriteOperation<TSchema> =
  | {
      deleteMany: {
        filter: PaprFilter<TSchema>;
        collation?: any;
        hint?: any;
      };
    }
  | {
      deleteOne: {
        filter: PaprFilter<TSchema>;
        collation?: any;
        hint?: any;
      };
    }
  | {
      replaceOne: {
        filter: PaprFilter<TSchema>;
        replacement: TSchema;
        upsert?: boolean;
        collation?: any;
        hint?: any;
      };
    }
  | {
      updateMany: {
        filter: PaprFilter<TSchema>;
        update: PaprUpdateFilter<TSchema>;
        upsert?: boolean;
        collation?: any;
        arrayFilters?: any[];
        hint?: any;
      };
    }
  | {
      updateOne: {
        filter: PaprFilter<TSchema>;
        update: PaprUpdateFilter<TSchema>;
        upsert?: boolean;
        collation?: any;
        arrayFilters?: any[];
        hint?: any;
      };
    }
  | {
      insertOne: {
        document: StrictOptionalId<TSchema>;
      };
    };

// ============================================================================
// Standard Schema Types
// ============================================================================

/**
 * Standard Schema v1 interface
 * Based on: https://github.com/standard-schema/standard-schema
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1.Properties<Input, Output>;
}

export namespace StandardSchemaV1 {
  export interface Properties<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (data: unknown) => data is Output;
    readonly types: {
      readonly input: Input;
      readonly output: Output;
    };
  }
}

// ============================================================================
// Legacy/Compatibility Types
// ============================================================================

/**
 * Flatten nested object types for dot notation (legacy)
 */
export type FlattenObject<T> = {
  [K in Join<NestedPaths<T, []>, '.'>]: PropertyType<T, K>;
};

/**
 * Utility type to get the type of a nested property (legacy - kept for compatibility)
 */
export type NestedPropertyType<T, P extends string> = PropertyType<T, P>;

/**
 * Optional ID if ObjectId (legacy)
 */
export type OptionalIdIfObjectId<TSchema> =
  TSchema extends { _id: infer I }
    ? I extends ObjectId
      ? Omit<TSchema, '_id'> & { _id?: I }
      : TSchema
    : TSchema;