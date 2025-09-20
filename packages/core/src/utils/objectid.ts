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
