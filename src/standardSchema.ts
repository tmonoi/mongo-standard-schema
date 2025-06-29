import type { StandardSchemaV1 } from '@standard-schema/spec';

// Standard Schema関連の型定義
export type { StandardSchemaV1 };

// 型推論用のヘルパー型
export type InferInput<TSchema extends StandardSchemaV1> = StandardSchemaV1.InferInput<TSchema>;
export type InferOutput<TSchema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<TSchema>;

// バリデーションエラー
export class ValidationError extends Error {
  issues: readonly StandardSchemaV1.Issue[];

  constructor(issues: readonly StandardSchemaV1.Issue[]) {
    super(`Validation failed: ${issues.map((issue) => issue.message).join(', ')}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

// Standard Schemaでバリデーションを実行するヘルパー関数
export async function validateWithStandardSchema<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  data: unknown
): Promise<InferOutput<TSchema>> {
  let result = schema['~standard'].validate(data);
  if (result instanceof Promise) {
    result = await result;
  }

  if (result.issues?.length) {
    throw new ValidationError(result.issues);
  }

  return (result as StandardSchemaV1.SuccessResult<InferOutput<TSchema>>).value;
}

// 同期バリデーション（Promiseを返さない場合のみ）
export function validateWithStandardSchemaSync<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  data: unknown
): InferOutput<TSchema> {
  const result = schema['~standard'].validate(data);
  if (result instanceof Promise) {
    throw new Error('Schema validation must be synchronous');
  }

  if (result.issues?.length) {
    throw new ValidationError(result.issues);
  }

  return (result as StandardSchemaV1.SuccessResult<InferOutput<TSchema>>).value;
}
