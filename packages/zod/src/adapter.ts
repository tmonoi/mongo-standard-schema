import { z, ZodObject, ZodString, ZodOptional } from 'zod';
import type { Adapter, Result, StrictOptionalId } from '@safe-mongo/core';
import { isObjectIdSchema } from './objectid.js';

/**
 * Zod adapter implementation
 * Only accepts ZodObject schemas to ensure extend() can be used safely
 */
export class ZodSchemaAdapter<
  TSchema extends ZodObject<any>,
  TInput = z.input<TSchema>,
  TOutput = z.output<TSchema>
> implements Adapter<TInput, TOutput> {
  constructor(private schema: TSchema) {}

  validate(data: unknown): Result<TOutput> {
    return this.schema['~standard']?.validate(data) as Result<TOutput>;
  }

  validateForInsert(data: StrictOptionalId<TInput>): Result<StrictOptionalId<TOutput>> {
    // schemaの_idをoptionalにする
    const shape = this.schema.shape;
    
    // _idフィールドが存在する場合のみoptionalにする
    if (shape._id) {
      const insertSchema = this.schema.extend({
        _id: z.optional(shape._id),
      }) as ZodObject<any>;
      
      // Use the standard schema validation
      return insertSchema['~standard']?.validate(data) as Result<StrictOptionalId<TOutput>>;
    }
    
    // If no _id field, use the original schema
    return this.schema['~standard']?.validate(data) as Result<StrictOptionalId<TOutput>>;
  }

  parseUpdateFields(fields: Record<string, unknown>): Record<string, unknown> {
    const processedFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
      // Handle nested fields with dot notation (e.g., 'aaa.bbb')
      const fieldSchema = this.getNestedFieldSchema(this.schema, key);
      
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
   * Get nested field schema by traversing the dot notation path
   */
  private getNestedFieldSchema(schema: ZodObject<any>, path: string): any {
    // If no dot in path, it's a top-level field
    if (!path.includes('.')) {
      return schema.shape[path];
    }

    // Split the path and traverse the schema
    const pathParts = path.split('.');
    let currentSchema: any = schema;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      
      if (!part || !currentSchema || !currentSchema.shape) {
        return null;
      }

      const fieldSchema = currentSchema.shape[part];
      if (!fieldSchema) {
        return null;
      }

      // If this is the last part of the path, return the field schema
      if (i === pathParts.length - 1) {
        return fieldSchema;
      }

      // Continue traversing for nested objects
      if (fieldSchema instanceof ZodObject) {
        currentSchema = fieldSchema;
      } else {
        // Handle optional schemas
        let unwrappedSchema = fieldSchema;
        
        // Unwrap optional, nullable, etc.
        while (unwrappedSchema && (
          unwrappedSchema._def?.typeName === 'ZodOptional' ||
          unwrappedSchema._def?.typeName === 'ZodNullable' ||
          unwrappedSchema._def?.typeName === 'ZodDefault'
        )) {
          unwrappedSchema = unwrappedSchema._def.innerType;
        }

        if (unwrappedSchema instanceof ZodObject) {
          currentSchema = unwrappedSchema;
        } else {
          // Can't traverse further, return null
          return null;
        }
      }
    }

    return null;
  }

  getIdFieldType(): 'string' | 'ObjectId' | 'none' {
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
}

/**
 * Helper function to create ZodSchemaAdapter with proper type inference
 * Only accepts ZodObject schemas
 */
export function zodAdapter<TSchema extends ZodObject<any>>(
  schema: TSchema,
): Adapter<z.input<TSchema>, z.output<TSchema>> {
  return new ZodSchemaAdapter(schema);
}