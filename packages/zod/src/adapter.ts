import { type z, ZodObject, ZodString, ZodEffects, ZodOptional } from 'zod';
import type { Adapter } from '@safe-mongo/core';
import { ObjectId } from 'mongodb';
import { isObjectIdSchema } from './objectid.js';

/**
 * Zod adapter implementation
 */
export class ZodSchemaAdapter<TInput, TOutput = TInput> implements Adapter<TInput, TOutput> {
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

  partial(): Adapter<Partial<TInput>, Partial<TOutput>> {
    // Check if the schema is a ZodObject using instanceof
    if (!(this.schema instanceof ZodObject)) {
      // If not a ZodObject, throw an error as partial() is not supported
      throw new Error('partial() is only supported for ZodObject schemas');
    }
    
    const partialSchema = this.schema.partial();
    // We need to use unknown as an intermediate step for type safety
    const adapter = new ZodSchemaAdapter(partialSchema) as unknown;
    return adapter as Adapter<Partial<TInput>, Partial<TOutput>>;
  }

  optional(): Adapter<TInput | undefined, TOutput | undefined> {
    return new ZodSchemaAdapter(this.schema.optional());
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

  getIdFieldType(): 'string' | 'ObjectId' | 'none' {
    if (!(this.schema instanceof ZodObject)) {
      return 'none';
    }
    
    const shape = this.schema.shape;
    if (!shape._id) return 'none';
    
    let idSchema = shape._id;
    
    // Unwrap optional schema if needed
    if (idSchema instanceof ZodOptional) {
      idSchema = idSchema._def.innerType;
    }
    
    // Check if it's a string schema
    if (idSchema instanceof ZodString) {
      return 'string';
    }
    
    // Check if it's our custom ObjectId schema using the brand
    if (isObjectIdSchema(idSchema)) {
      return 'ObjectId';
    }
    
    // Default to string for backward compatibility
    return 'string';
  }

  /**
   * Static factory method to create ZodAdapter from Zod schema
   */
  static create<TInput, TOutput = TInput>(
    schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
  ): ZodSchemaAdapter<TInput, TOutput> {
    return new ZodSchemaAdapter(schema);
  }
}

/**
 * Helper function to create ZodSchemaAdapter
 */
export function zodAdapter<TInput, TOutput = TInput>(
  schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
): ZodSchemaAdapter<TInput, TOutput> {
  return ZodSchemaAdapter.create(schema);
}