import { z } from 'zod';
import { ObjectId } from 'mongodb';

/**
 * Brand for ObjectId schema identification
 */
const OBJECTID_BRAND = Symbol('ObjectIdSchema');

/**
 * Zod schema for MongoDB ObjectId
 * Accepts both ObjectId instances and valid ObjectId strings
 * Transforms strings to ObjectId instances
 */
export const objectId = () => {
  const schema = z.custom<ObjectId>(
    (val) => {
      if (val instanceof ObjectId) return true;
      if (typeof val === 'string' && ObjectId.isValid(val)) return true;
      return false;
    },
    { message: "Invalid ObjectId" }
  ).transform((val) =>
    val instanceof ObjectId ? val : new ObjectId(val as string)
  );
  
  // Add brand for identification
  (schema as any)._brand = OBJECTID_BRAND;
  
  return schema;
};

/**
 * Check if a schema is an ObjectId schema
 */
export function isObjectIdSchema(schema: unknown): boolean {
  return schema !== null &&
         typeof schema === 'object' &&
         '_brand' in schema &&
         (schema as any)._brand === OBJECTID_BRAND;
}

/**
 * Type helper for ObjectId schema
 */
export type ObjectIdSchema = ReturnType<typeof objectId>;