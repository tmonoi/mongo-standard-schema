/* eslint-disable no-use-before-define */

import { ObjectId } from 'mongodb';
import type { Join, KeysOfAType, OptionalId, WithId } from 'mongodb';
import type { DeepPick } from './DeepPick';

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

// Import types from types.ts to avoid circular dependency
import type { NestedPaths, PropertyType } from './types.js';

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


export type RequireAtLeastOne<TObj, Keys extends keyof TObj = keyof TObj> = {
  [Key in Keys]-?: Partial<Pick<TObj, Exclude<Keys, Key>>> & Required<Pick<TObj, Key>>;
}[Keys] &
  Pick<TObj, Exclude<keyof TObj, Keys>>;

export function getIds(ids: Set<string> | readonly (ObjectId | string)[]): ObjectId[] {
  return [...ids].map((id) => new ObjectId(id));
}
