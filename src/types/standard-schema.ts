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

/**
 * Type guard to check if a value implements StandardSchemaV1
 */
export function isStandardSchemaV1(value: unknown): value is StandardSchemaV1 {
  return (
    typeof value === 'object' &&
    value !== null &&
    '~standard' in value &&
    typeof (value as any)['~standard'] === 'object' &&
    (value as any)['~standard'].version === 1
  );
}

/**
 * Helper type to extract input type from StandardSchemaV1
 */
export type InferStandardInput<T> = T extends StandardSchemaV1<infer Input, any> ? Input : never;

/**
 * Helper type to extract output type from StandardSchemaV1
 */
export type InferStandardOutput<T> = T extends StandardSchemaV1<any, infer Output> ? Output : never;