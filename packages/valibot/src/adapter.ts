import type { BaseSchema, InferInput, InferOutput } from 'valibot';
import * as v from 'valibot';
import type { Adapter } from '@safe-mongo/core';

/**
 * Valibot schema adapter implementation
 */
export class ValibotSchemaAdapter<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>
  implements Adapter<InferInput<TSchema>, InferOutput<TSchema>> {
  
  constructor(private schema: TSchema) {}

  parse(data: unknown): InferOutput<TSchema> {
    return v.parse(this.schema, data);
  }

  parseUpdateFields(fields: Record<string, unknown>): Record<string, unknown> {
    // For object schemas, validate individual fields
    const schemaType = (this.schema as any).type;
    if (schemaType !== 'object') {
      return fields;
    }
    
    const processedFields: Record<string, unknown> = {};
    const entries = (this.schema as any).entries || {};
    
    for (const [key, value] of Object.entries(fields)) {
      const fieldSchema = entries[key];
      if (fieldSchema) {
        try {
          processedFields[key] = v.parse(fieldSchema, value);
        } catch {
          // If parsing fails, use the original value
          processedFields[key] = value;
        }
      } else {
        processedFields[key] = value;
      }
    }
    
    return processedFields;
  }

  /**
   * Static factory method to create ValibotSchemaAdapter from Valibot schema
   */
  static create<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
    schema: TSchema,
  ): ValibotSchemaAdapter<TSchema> {
    return new ValibotSchemaAdapter(schema);
  }
}

/**
 * Helper function to create ValibotSchemaAdapter
 */
export function valibotAdapter<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: TSchema,
): ValibotSchemaAdapter<TSchema> {
  return ValibotSchemaAdapter.create(schema);
}