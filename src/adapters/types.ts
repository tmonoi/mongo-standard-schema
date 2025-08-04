import type { z } from 'zod';
import type { BaseSchema, InferInput as VInferInput, InferOutput as VInferOutput } from 'valibot';

/**
 * Type helper for Zod schemas
 */
export interface ZodSchemaInfer<TSchema extends z.ZodType> {
  input: z.input<TSchema>;
  output: z.output<TSchema>;
}

/**
 * Type helper for Valibot schemas
 */
export interface ValibotSchemaInfer<TSchema extends BaseSchema<any, any, any>> {
  input: VInferInput<TSchema>;
  output: VInferOutput<TSchema>;
}

/**
 * Generic schema type that can be either Zod or Valibot
 */
export type AnySchema = z.ZodType | BaseSchema<any, any, any>;

/**
 * Infer input/output types from a schema
 */
export type InferSchema<TSchema> = 
  TSchema extends z.ZodType ? ZodSchemaInfer<TSchema> :
  TSchema extends BaseSchema<any, any, any> ? ValibotSchemaInfer<TSchema> :
  { input: any; output: any };