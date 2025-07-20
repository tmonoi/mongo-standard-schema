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
export function convertIdForMongo(doc: any): any {
  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  if ('_id' in doc && typeof doc._id === 'string') {
    return {
      ...doc,
      _id: stringToObjectId(doc._id),
    };
  }
  return doc;
}

/**
 * Convert _id field from ObjectId to string for user-facing operations
 */
export function convertIdFromMongo(doc: any): any {
  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  if ('_id' in doc && doc._id instanceof ObjectId) {
    return {
      ...doc,
      _id: objectIdToString(doc._id),
    };
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
