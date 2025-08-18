/* eslint-disable no-use-before-define */

import { ObjectId } from 'mongodb';
import type { Join, KeysOfAType, OptionalId, WithId } from 'mongodb';
import type { DeepPick } from './DeepPick';
import type { PaprBulkWriteOperation, PaprUpdateFilter } from './types.js';

// Some of the types are adapted from originals at: https://github.com/mongodb/node-mongodb-native/blob/v5.0.1/src/mongo_types.ts
// licensed under Apache License 2.0: https://github.com/mongodb/node-mongodb-native/blob/v5.0.1/LICENSE.md

export enum VALIDATION_ACTIONS {
  ERROR = 'error',
  WARN = 'warn',
}

export enum VALIDATION_LEVEL {
  MODERATE = 'moderate',
  OFF = 'off',
  STRICT = 'strict',
}

export interface BaseSchema {
  _id: ObjectId | number | string;
}

export type DocumentForInsertWithoutDefaults<TSchema, TDefaults extends Partial<TSchema>> = Omit<
  OptionalId<TSchema>,
  keyof TDefaults
> &
  Partial<Pick<TSchema, keyof TDefaults & keyof TSchema>>;

export type Identity<Type> = Type;

export type Flatten<Type extends object> = Identity<{
  [Key in keyof Type]: Type[Key];
}>;

/**
 * Returns tuple of strings (keys to be joined on '.') that represent every path into a schema
 *
 * https://docs.mongodb.com/manual/tutorial/query-embedded-documents/
 *
 * @remarks
 * Through testing we determined that a depth of 6 is safe for the typescript compiler
 * and provides reasonable compilation times. This number is otherwise not special and
 * should be changed if issues are found with this level of checking. Beyond this
 * depth any helpers that make use of NestedPaths should devolve to not asserting any
 * type safety on the input.
 */
export type NestedPaths<Type, Depth extends number[]> = Depth['length'] extends 6
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

type FilterProperties<TObject, TValue> = Pick<TObject, KeysOfAType<TObject, TValue>>;

export type ProjectionType<
  TSchema extends BaseSchema,
  Projection extends
    | Partial<Record<Join<NestedPaths<WithId<TSchema>, []>, '.'>, number>>
    | undefined,
> = undefined extends Projection
  ? WithId<TSchema>
  : keyof FilterProperties<Projection, 0 | 1> extends never
    ? WithId<DeepPick<TSchema, '_id' | (string & keyof Projection)>>
    : keyof FilterProperties<Projection, 1> extends never
      ? Omit<WithId<TSchema>, keyof FilterProperties<Projection, 0>>
      : Omit<
          WithId<DeepPick<TSchema, '_id' | (string & keyof Projection)>>,
          keyof FilterProperties<Projection, 0>
        >;

export type Projection<TSchema> = Partial<
  Record<Join<NestedPaths<WithId<TSchema>, []>, '.'>, number>
>;

export type PropertyNestedType<
  Type,
  Property extends string,
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

export type PropertyType<Type, Property extends string> = string extends Property
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

export type RequireAtLeastOne<TObj, Keys extends keyof TObj = keyof TObj> = {
  [Key in Keys]-?: Partial<Pick<TObj, Exclude<Keys, Key>>> & Required<Pick<TObj, Key>>;
}[Keys] &
  Pick<TObj, Exclude<keyof TObj, Keys>>;

export function getIds(ids: Set<string> | readonly (ObjectId | string)[]): ObjectId[] {
  return [...ids].map((id) => new ObjectId(id));
}
