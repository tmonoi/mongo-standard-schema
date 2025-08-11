import { ObjectId } from 'mongodb';

/**
 * Convert string to ObjectId
 */
export function stringToObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

/**
 * Convert ObjectId to string
 */
export function objectIdToString(id: ObjectId): string {
  return id.toString();
}

/**
 * Check if a string is a valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

/**
 * Convert _id field from string to ObjectId for MongoDB operations
 * @param doc - The document to convert
 * @param isStringSchema - Whether the schema expects string _id (default: false)
 */
export function convertIdForMongo<T>(doc: T, isStringSchema = false): T {
  if (!doc || typeof doc !== 'object' || isStringSchema) {
    return doc;
  }

  const docRecord = doc as Record<string, unknown>;
  if ('_id' in docRecord && typeof docRecord._id === 'string') {
    return {
      ...docRecord,
      _id: stringToObjectId(docRecord._id),
    } as T;
  }
  return doc;
}

/**
 * Convert _id field from ObjectId to string for user-facing operations
 * @param doc - The document to convert
 * @param isStringSchema - Whether the schema expects string _id (default: false)
 */
export function convertIdFromMongo<T>(doc: T, isStringSchema = false): T {
  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  const docRecord = doc as Record<string, unknown>;
  if ('_id' in docRecord && docRecord._id instanceof ObjectId && isStringSchema) {
    return {
      ...docRecord,
      _id: objectIdToString(docRecord._id),
    } as T;
  }
  return doc;
}

/**
 * Convert filter object to use ObjectId for _id fields
 * @param filter - The filter to convert
 * @param isStringSchema - Whether the schema expects string _id (default: false)
 */
export function convertFilterForMongo<T>(filter: T, isStringSchema = false): T {
  if (!filter || typeof filter !== 'object') {
    return filter;
  }

  // For string schemas, don't convert - keep everything as is
  if (isStringSchema) {
    return filter;
  }

  // For ObjectId schemas, we might need to convert string _ids to ObjectId
  const converted = { ...filter } as Record<string, unknown>;

  // Handle direct _id field
  if ('_id' in converted) {
    if (typeof converted._id === 'string') {
      converted._id = stringToObjectId(converted._id);
    }
    // If it's already an ObjectId, keep it as is
  }

  // Handle _id in nested operators
  for (const [key, value] of Object.entries(converted)) {
    if (key === '_id' && typeof value === 'object' && value !== null && !(value instanceof ObjectId)) {
      const idFilter = { ...value } as Record<string, unknown>;
      for (const [op, val] of Object.entries(idFilter)) {
        if (typeof val === 'string') {
          idFilter[op] = stringToObjectId(val);
        } else if (Array.isArray(val)) {
          idFilter[op] = val.map((v) => (typeof v === 'string' ? stringToObjectId(v) : v));
        }
      }
      converted._id = idFilter;
    }
  }

  return converted as T;
}