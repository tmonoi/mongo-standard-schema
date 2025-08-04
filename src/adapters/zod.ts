import { type z, ZodObject, type ZodType } from 'zod';
import type { SchemaAdapter } from './base.js';
import type { AdapterFactory } from './factory.js';

/**
 * Type helper for Zod schemas
 */
export interface ZodSchemaInfer<TSchema extends z.ZodType> {
  input: z.input<TSchema>;
  output: z.output<TSchema>;
}

/**
 * Zod-specific adapter factory interface
 */
export interface ZodAdapterFactory extends AdapterFactory<z.ZodType> {
  create<TSchema extends z.ZodType>(
    schema: TSchema
  ): SchemaAdapter<z.input<TSchema>, z.output<TSchema>>;
}

/**
 * Zod adapter implementation
 */
export class ZodAdapter<TInput, TOutput = TInput> implements SchemaAdapter<TInput, TOutput> {
  constructor(private schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>) {}

  parse(data: unknown): TOutput {
    return this.schema.parse(data);
  }

  safeParse(data: unknown): { success: true; data: TOutput } | { success: false; error: unknown } {
    const result = this.schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  }

  partial(): SchemaAdapter<Partial<TInput>, Partial<TOutput>> {
    // Check if the schema is a ZodObject using instanceof
    if (!(this.schema instanceof ZodObject)) {
      // If not a ZodObject, throw an error as partial() is not supported
      throw new Error('partial() is only supported for ZodObject schemas');
    }
    
    const partialSchema = this.schema.partial();
    // We need to use unknown as an intermediate step for type safety
    const adapter = new ZodAdapter(partialSchema) as unknown;
    return adapter as SchemaAdapter<Partial<TInput>, Partial<TOutput>>;
  }

  optional(): SchemaAdapter<TInput | undefined, TOutput | undefined> {
    return new ZodAdapter(this.schema.optional());
  }

  getSchema(): z.ZodType<TOutput, z.ZodTypeDef, TInput> {
    return this.schema;
  }

  parseUpdateFields(fields: Record<string, unknown>): Record<string, unknown> {
    // Check if the schema is a ZodObject using instanceof
    if (!(this.schema instanceof ZodObject)) {
      // If not a ZodObject, return fields as-is
      return fields;
    }

    const schema = this.schema;
    const processedFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
      const fieldSchema = schema.shape[key];
      if (fieldSchema) {
        // Use safeParse for error handling
        const result = fieldSchema.safeParse(value);
        if (result.success) {
          processedFields[key] = result.data;
        } else {
          // If parsing fails, use the original value
          processedFields[key] = value;
        }
      } else {
        // No schema for this field, use the value as-is
        processedFields[key] = value;
      }
    }

    return processedFields;
  }

  /**
   * Static factory method to create ZodAdapter from Zod schema
   */
  static create<TInput, TOutput = TInput>(
    schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
  ): ZodAdapter<TInput, TOutput> {
    return new ZodAdapter(schema);
  }
}

/**
 * Helper function to create ZodAdapter
 */
export function zodAdapter<TInput, TOutput = TInput>(
  schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
): ZodAdapter<TInput, TOutput> {
  return ZodAdapter.create(schema);
}

/**
 * Zod adapter factory
 */
export const zodAdapterFactory: ZodAdapterFactory = {
  name: 'zod',
  create<TSchema extends z.ZodType>(schema: TSchema) {
    return new ZodAdapter(schema) as SchemaAdapter<z.input<TSchema>, z.output<TSchema>>;
  }
};
