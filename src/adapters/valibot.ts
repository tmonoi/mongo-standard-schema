import type { BaseSchema, InferInput, InferOutput } from 'valibot';
import * as v from 'valibot';
import type { SchemaAdapter } from './base.js';
import type { AdapterFactory } from './factory.js';

/**
 * Type helper for Valibot schemas
 */
export interface ValibotSchemaInfer<TSchema extends BaseSchema<any, any, any>> {
  input: InferInput<TSchema>;
  output: InferOutput<TSchema>;
}

/**
 * Valibot-specific adapter factory interface
 */
export interface ValibotAdapterFactory extends AdapterFactory<BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> {
  create<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
    schema: TSchema
  ): SchemaAdapter<InferInput<TSchema>, InferOutput<TSchema>>;
}

/**
 * Valibot adapter implementation
 */
export class ValibotAdapter<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>
  implements SchemaAdapter<InferInput<TSchema>, InferOutput<TSchema>> {
  
  constructor(private schema: TSchema) {}

  parse(data: unknown): InferOutput<TSchema> {
    return v.parse(this.schema, data);
  }

  safeParse(data: unknown): { success: true; data: InferOutput<TSchema> } | { success: false; error: unknown } {
    const result = v.safeParse(this.schema, data);
    if (result.success) {
      return { success: true, data: result.output };
    }
    return { success: false, error: result.issues };
  }

  partial(): SchemaAdapter<Partial<InferInput<TSchema>>, Partial<InferOutput<TSchema>>> {
    // Check if schema is an object schema
    const schemaType = (this.schema as any).type;
    if (schemaType !== 'object') {
      throw new Error('partial() is only supported for object schemas');
    }
    
    const partialSchema = v.partial(this.schema as any);
    return new ValibotAdapter(partialSchema as any) as any;
  }

  optional(): SchemaAdapter<InferInput<TSchema> | undefined, InferOutput<TSchema> | undefined> {
    const optionalSchema = v.optional(this.schema);
    return new ValibotAdapter(optionalSchema) as any;
  }

  getSchema(): TSchema {
    return this.schema;
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
   * Static factory method to create ValibotAdapter from Valibot schema
   */
  static create<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
    schema: TSchema,
  ): ValibotAdapter<TSchema> {
    return new ValibotAdapter(schema);
  }
}

/**
 * Helper function to create ValibotAdapter
 */
export function valibotAdapter<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: TSchema,
): ValibotAdapter<TSchema> {
  return ValibotAdapter.create(schema);
}

/**
 * Valibot adapter factory
 */
export const valibotAdapterFactory: ValibotAdapterFactory = {
  name: 'valibot',
  create<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(schema: TSchema) {
    return new ValibotAdapter(schema) as SchemaAdapter<InferInput<TSchema>, InferOutput<TSchema>>;
  }
};