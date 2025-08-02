import type { z } from 'zod';
import type { SchemaAdapter } from './base.js';

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
    return new ZodAdapter((this.schema as any).partial());
  }

  optional(): SchemaAdapter<TInput | undefined, TOutput | undefined> {
    return new ZodAdapter(this.schema.optional());
  }

  getSchema(): z.ZodType<TOutput, z.ZodTypeDef, TInput> {
    return this.schema;
  }

  parseUpdateFields(fields: Record<string, unknown>): Record<string, unknown> {
    // Check if the schema is a ZodObject
    const schema = this.schema as any;
    if (!schema.shape || typeof schema.shape !== 'object') {
      // If not a ZodObject, return fields as-is
      return fields;
    }

    const processedFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
      const fieldSchema = schema.shape[key];
      if (fieldSchema?.parse) {
        // Parse the field value to apply defaults and validation
        processedFields[key] = fieldSchema.parse(value);
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
