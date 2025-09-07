/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-use-before-define */

import type {
  AlternativeType,
  ArrayElement,
  BitwiseFilter,
  BSONRegExp,
  BSONType,
  BSONTypeAlias,
  Document,
  IntegerType,
  Join,
  KeysOfAType,
  NumericType,
  OnlyFieldsOfType,
  PullOperator,
  PushOperator,
  SetFields,
  Timestamp,
} from "mongodb";

import { ObjectId } from "mongodb";

import type { DeepPick } from "./DeepPick";
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

// Forward declarations for types that will be defined in utils.ts
export type NestedPaths<
  Type,
  Depth extends number[]
> = Depth["length"] extends 6
  ? []
  : Type extends
      | Buffer
      | Date
      | RegExp
      | Uint8Array
      | boolean
      | number
      | string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | ((...args: any[]) => any)
      | {
          _bsontype: string;
        }
  ? []
  : Type extends readonly (infer ArrayType)[]
  ? // This returns the non-indexed dot-notation path: e.g. `foo.bar`
    | [...NestedPaths<ArrayType, [...Depth, 1]>]
      // This returns the array parent itself: e.g. `foo`
      | []
      // This returns the indexed dot-notation path: e.g. `foo.0.bar`
      | [number, ...NestedPaths<ArrayType, [...Depth, 1]>]
      // This returns the indexed element path: e.g. `foo.0`
      | [number]
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Type extends Map<string, any>
  ? [string]
  : Type extends object
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [Key in Extract<keyof Type, string>]: Type[Key] extends readonly any[]
        ? [Key, ...NestedPaths<Type[Key], [...Depth, 1]>] // child is not structured the same as the parent
        : [Key, ...NestedPaths<Type[Key], [...Depth, 1]>] | [Key];
    }[Extract<keyof Type, string>]
  : [];

export type PropertyNestedType<
  Type,
  Property extends string
> = Property extends `${infer Key}.${infer Rest}`
  ? Key extends `${number}`
    ? // indexed array nested properties
      NonNullable<Type> extends readonly (infer ArrayType)[]
      ? PropertyType<ArrayType, Rest>
      : unknown
    : // object nested properties & non-indexed array nested properties
    Key extends keyof Type
    ? Type[Key] extends Map<string, infer MapType>
      ? MapType
      : PropertyType<NonNullable<Type[Key]>, Rest>
    : unknown
  : unknown;

export type PropertyType<
  Type,
  Property extends string
> = string extends Property
  ? unknown
  : // object properties
  Property extends keyof Type
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Type extends Record<string, any>
    ? Property extends `${string}.${string}`
      ? PropertyNestedType<NonNullable<Type>, Property>
      : Type[Property]
    : Type[Property]
  : Type extends readonly (infer ArrayType)[]
  ? // indexed array properties
    Property extends `${number}`
    ? ArrayType
    : // non-indexed array properties
    Property extends keyof ArrayType
    ? PropertyType<ArrayType, Property>
    : PropertyNestedType<NonNullable<Type>, Property>
  : PropertyNestedType<NonNullable<Type>, Property>;

export type PaprFilter<TSchema> =
  | Partial<TSchema>
  | (PaprFilterConditions<TSchema> &
      PaprRootFilterOperators<TSchema>);

export type PaprFilterConditions<TSchema> = {
  [Property in Join<NestedPaths<TSchema, []>, ".">]?: PaprCondition<
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
  $not?: TValue extends string
    ? PaprFilterOperators<TValue> | RegExp
    : PaprFilterOperators<TValue>;
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
 * Custom PushOperator type that properly handles array fields
 */
export type PaprPushOperator<TSchema> = PushOperator<TSchema>;

/**
 * Custom PullOperator type that properly handles array fields
 */
export type PaprPullOperator<TSchema> = PullOperator<TSchema>;

/**
 * Custom PullAllOperator type that properly handles array fields
 */
export type PaprPullAllOperator<TSchema> = {
  [K in keyof TSchema as TSchema[K] extends readonly any[]
    ? K
    : never]?: ArrayElement<TSchema[K]>[];
};

/**
 * Returns all dot-notation properties of a schema with their corresponding types.
 */
export type PaprAllProperties<TSchema> = {
  [Property in Join<NestedPaths<TSchema, []>, ".">]?: PropertyType<
    TSchema,
    Property
  >;
} & {
  [K in keyof TSchema]?: TSchema[K];
};

/**
 * Returns all array-specific element dot-notation properties
 */
export type PaprArrayElementsProperties<TSchema> = {
  [Property in `${Extract<
    KeysOfAType<PaprAllProperties<TSchema>, any[]>,
    string
  >}.$${"" | `[${string}]`}`]?: ArrayElement<
    PropertyType<
      TSchema,
      Property extends `${infer Key}.$${string}` ? Key : never
    >
  >;
};

/**
 * Returns all array-specific nested dot-notation properties
 */
export type PaprArrayNestedProperties<TSchema> = {
  [Property in `${Extract<
    KeysOfAType<PaprAllProperties<TSchema>, Record<string, any>[]>,
    string
  >}.$${"" | `[${string}]`}.${string}`]?: PropertyType<
    TSchema,
    Property extends `${infer Base}.$${string}.${infer Rest}`
      ? `${Base}.0.${Rest}`
      : never
  >;
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
        $type: "date" | "timestamp";
      }
  >;
  $inc?: OnlyFieldsOfType<TSchema, NumericType | undefined>;
  $min?: PaprMatchKeysAndValues<TSchema>;
  $max?: PaprMatchKeysAndValues<TSchema>;
  $mul?: OnlyFieldsOfType<TSchema, NumericType | undefined>;
  $rename?: Record<string, string>;
  $set?: PaprMatchKeysAndValues<TSchema>;
  $setOnInsert?: PaprMatchKeysAndValues<TSchema>;
  $unset?: {
    [K in keyof PaprMatchKeysAndValues<TSchema>]?: "" | 1 | true;
  };
  $addToSet?: SetFields<TSchema>;
  $pop?: OnlyFieldsOfType<TSchema, readonly any[], -1 | 1>;
  $pull?: PaprPullOperator<TSchema>;
  $push?: PaprPushOperator<TSchema>;
  $pullAll?: PaprPullAllOperator<TSchema>;
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
 * Result type after projection is applied
 */
export type ProjectionResult<TSchema extends BaseSchema, TProjection> = TProjection extends Record<
  string,
  unknown
>
  ? TProjection extends Record<string, 1 | true>
    ? {
        [K in keyof TProjection as TProjection[K] extends 1 | true
          ? K
          : never]: K extends keyof TSchema
          ? TSchema[K]
          : never;
      } & {
        _id: TSchema["_id"];
      }
    : TProjection extends Record<string, 0 | false>
    ? Omit<TSchema, keyof TProjection>
    : TSchema
  : TSchema;

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
// Legacy/Compatibility Types
// ============================================================================

/**
 * Flatten nested object types for dot notation (legacy)
 */
export type FlattenObject<T> = {
  [K in Join<NestedPaths<T, []>, ".">]: PropertyType<T, K>;
};

/**
 * Utility type to get the type of a nested property (legacy - kept for compatibility)
 */
export type NestedPropertyType<T, P extends string> = PropertyType<T, P>;

/**
 * Optional ID if ObjectId (legacy)
 */
export type OptionalIdIfObjectId<TSchema> = TSchema extends { _id: infer I }
  ? I extends ObjectId
    ? Omit<TSchema, "_id"> & { _id?: I }
    : TSchema
  : TSchema;

export interface BaseSchema {
  _id: ObjectId | number | string;
}

export type Identity<Type> = Type;

export type Flatten<Type extends object> = Identity<{
  [Key in keyof Type]: Type[Key];
}>;

type FilterProperties<TObject, TValue> = Pick<
  TObject,
  KeysOfAType<TObject, TValue>
>;

export type ProjectionType<
  TSchema extends BaseSchema,
  Projection extends
    | Partial<Record<Join<NestedPaths<TSchema, []>, ".">, number>>
    | undefined
> = undefined extends Projection
  ? TSchema
  : keyof FilterProperties<Projection, 0 | 1> extends never
  ? DeepPick<TSchema, "_id" | (string & keyof Projection)>
  : keyof FilterProperties<Projection, 1> extends never
  ? Omit<TSchema, keyof FilterProperties<Projection, 0>>
  : Omit<
      DeepPick<TSchema, "_id" | (string & keyof Projection)>,
      keyof FilterProperties<Projection, 0>
    >;

export type Projection<TSchema> = Partial<
  Record<Join<NestedPaths<TSchema, []>, ".">, number>
>;

export type RequireAtLeastOne<TObj, Keys extends keyof TObj = keyof TObj> = {
  [Key in Keys]-?: Partial<Pick<TObj, Exclude<Keys, Key>>> &
    Required<Pick<TObj, Key>>;
}[Keys] &
  Pick<TObj, Exclude<keyof TObj, Keys>>;

export function getIds(
  ids: Set<string> | readonly (ObjectId | string)[]
): ObjectId[] {
  return [...ids].map((id) => new ObjectId(id));
}
