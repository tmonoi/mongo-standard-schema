import type { BaseSchema, InferInput, InferOutput } from 'valibot';
import * as v from 'valibot';
import type { Adapter } from './base.js';
import { StandardSchemaAdapter } from './standard-schema-adapter.js';
import type { StandardSchemaV1 } from '../types/standard-schema.js';

/**
 * Valibot schema adapter implementation
 */
export class ValibotSchemaAdapter<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>
  implements Adapter<InferInput<TSchema>, InferOutput<TSchema>> {
  
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

  partial(): Adapter<Partial<InferInput<TSchema>>, Partial<InferOutput<TSchema>>> {
    // Check if schema is an object schema
    const schemaType = (this.schema as any).type;
    if (schemaType !== 'object') {
      throw new Error('partial() is only supported for object schemas');
    }
    
    const partialSchema = v.partial(this.schema as any);
    return new ValibotSchemaAdapter(partialSchema as any) as any;
  }

  optional(): Adapter<InferInput<TSchema> | undefined, InferOutput<TSchema> | undefined> {
    const optionalSchema = v.optional(this.schema);
    return new ValibotSchemaAdapter(optionalSchema) as any;
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
   * Static factory method to create ValibotSchemaAdapter from Valibot schema
   */
  static create<TSchema extends BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
    schema: TSchema,
  ): ValibotSchemaAdapter<TSchema> {
    return new ValibotSchemaAdapter(schema);
  }
}

/**
 * Valibot adapter for Standard Schema
 */
export class ValibotAdapter extends StandardSchemaAdapter {
  readonly name = 'valibot';

  supports(schema: unknown): boolean {
    // Check if it's a Valibot schema
    return (
      typeof schema === 'object' &&
      schema !== null &&
      'kind' in schema &&
      typeof (schema as any).kind === 'string' &&
      'async' in schema &&
      typeof (schema as any).async === 'boolean'
    );
  }

  create(schema: unknown): Adapter<unknown, unknown> {
    if (this.supports(schema)) {
      return new ValibotSchemaAdapter(schema as BaseSchema<unknown, unknown, v.BaseIssue<unknown>>);
    }
    throw new Error(`Schema is not supported by ${this.name} adapter`);
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