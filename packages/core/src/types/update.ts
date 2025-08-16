import type { FlattenObject, NumericType, WithId } from './utils.js';

/**
 * Extract only fields of specific type
 */
export type OnlyFieldsOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Match keys and values for update operations - strict version
 * Only allows existing fields from the schema
 */
export type PaprMatchKeysAndValues<T> = {
  [K in keyof T]?: T[K];
};

/**
 * MongoDB update operators
 */
export interface PaprUpdateFilter<TSchema> {
  // Field update operators
  $set?: PaprMatchKeysAndValues<TSchema>;
  $setOnInsert?: PaprMatchKeysAndValues<TSchema>;
  $unset?: {
    [K in keyof FlattenObject<TSchema>]?: '' | 1 | true;
  };
  $inc?: {
    [K in OnlyFieldsOfType<FlattenObject<TSchema>, NumericType | undefined>]?: number;
  };
  $mul?: {
    [K in OnlyFieldsOfType<FlattenObject<TSchema>, NumericType | undefined>]?: number;
  };
  $min?: PaprMatchKeysAndValues<TSchema>;
  $max?: PaprMatchKeysAndValues<TSchema>;
  $currentDate?: {
    [K in keyof FlattenObject<TSchema>]?: true | { $type: 'date' | 'timestamp' };
  };
  $rename?: {
    [K in keyof FlattenObject<TSchema>]?: string;
  };

  // Array update operators
  $addToSet?: {
    [K in keyof TSchema]?: TSchema[K] extends readonly unknown[]
      ? TSchema[K][number] | { $each: TSchema[K] }
      : never;
  };
  $pop?: {
    [K in keyof TSchema]?: TSchema[K] extends readonly unknown[] ? 1 | -1 : never;
  };
  $pull?: {
    [K in keyof TSchema]?: TSchema[K] extends readonly unknown[]
      ? TSchema[K][number]
      : never;
  };
  $pullAll?: {
    [K in keyof TSchema]?: TSchema[K] extends readonly unknown[]
      ? TSchema[K]
      : never;
  };
  $push?: {
    [K in keyof TSchema]?: TSchema[K] extends readonly unknown[]
      ?
          | TSchema[K][number]
          | {
              $each?: TSchema[K];
              $position?: number;
              $slice?: number;
              $sort?: 1 | -1 | Record<string, 1 | -1>;
            }
      : never;
  };

  // Bitwise operators
  $bit?: {
    [K in OnlyFieldsOfType<FlattenObject<TSchema>, number | undefined>]?: {
      and?: number;
      or?: number;
      xor?: number;
    };
  };
}