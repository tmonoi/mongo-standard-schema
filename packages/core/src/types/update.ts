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
  $set?: PaprMatchKeysAndValues<WithId<TSchema>>;
  $unset?: {
    [K in keyof FlattenObject<WithId<TSchema>>]?: '' | 1 | true;
  };
  $inc?: {
    [K in OnlyFieldsOfType<FlattenObject<WithId<TSchema>>, NumericType | undefined>]?: number;
  };
  $mul?: {
    [K in OnlyFieldsOfType<FlattenObject<WithId<TSchema>>, NumericType | undefined>]?: number;
  };
  $min?: PaprMatchKeysAndValues<WithId<TSchema>>;
  $max?: PaprMatchKeysAndValues<WithId<TSchema>>;
  $currentDate?: {
    [K in keyof FlattenObject<WithId<TSchema>>]?: true | { $type: 'date' | 'timestamp' };
  };
  $rename?: {
    [K in keyof FlattenObject<WithId<TSchema>>]?: string;
  };

  // Array update operators
  $addToSet?: {
    [K in keyof WithId<TSchema>]?: WithId<TSchema>[K] extends readonly unknown[]
      ? WithId<TSchema>[K][number] | { $each: WithId<TSchema>[K] }
      : never;
  };
  $pop?: {
    [K in keyof WithId<TSchema>]?: WithId<TSchema>[K] extends readonly unknown[] ? 1 | -1 : never;
  };
  $pull?: {
    [K in keyof WithId<TSchema>]?: WithId<TSchema>[K] extends readonly unknown[]
      ? WithId<TSchema>[K][number]
      : never;
  };
  $pullAll?: {
    [K in keyof WithId<TSchema>]?: WithId<TSchema>[K] extends readonly unknown[]
      ? WithId<TSchema>[K]
      : never;
  };
  $push?: {
    [K in keyof WithId<TSchema>]?: WithId<TSchema>[K] extends readonly unknown[]
      ?
          | WithId<TSchema>[K][number]
          | {
              $each?: WithId<TSchema>[K];
              $position?: number;
              $slice?: number;
              $sort?: 1 | -1 | Record<string, 1 | -1>;
            }
      : never;
  };

  // Bitwise operators
  $bit?: {
    [K in OnlyFieldsOfType<FlattenObject<WithId<TSchema>>, number | undefined>]?: {
      and?: number;
      or?: number;
      xor?: number;
    };
  };
}