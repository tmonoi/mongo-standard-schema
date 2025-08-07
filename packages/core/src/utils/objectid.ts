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
 */
export function convertIdForMongo<T>(doc: T): T {
  if (!doc || typeof doc !== 'object') {
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
 */
export function convertIdFromMongo<T>(doc: T): T {
  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  const docRecord = doc as Record<string, unknown>;
  if ('_id' in docRecord && docRecord._id instanceof ObjectId) {
    return {
      ...docRecord,
      _id: objectIdToString(docRecord._id),
    } as T;
  }
  return doc;
}

/**
 * Convert filter object to use ObjectId for _id fields
 */
export function convertFilterForMongo<T>(filter: T): T {
  if (!filter || typeof filter !== 'object') {
    return filter;
  }

  const converted = { ...filter } as Record<string, unknown>;

  // Handle direct _id field
  if ('_id' in converted && typeof converted._id === 'string') {
    converted._id = stringToObjectId(converted._id);
  }

  // Handle _id in nested operators
  for (const [key, value] of Object.entries(converted)) {
    if (key === '_id' && typeof value === 'object' && value !== null) {
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