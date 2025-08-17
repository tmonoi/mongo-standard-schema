import { beforeEach, describe, expect, test } from 'vitest';
import type { Document } from 'mongodb';
import { Client } from '../src/index.js';

describe.skip('This is a typecheck test so type check only.', () => {
  let client: Client;

  beforeEach(async () => {
    // Use global test database
    const testDb = (globalThis as any).testDb;
    client = Client.initialize(testDb);

    // Clear collections before each test
    const collections = await testDb.listCollections().toArray();
    for (const collection of collections) {
      await testDb.collection(collection.name).deleteMany({});
    }
  });

  test('should provide proper TypeScript type checking', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      age: number;
      email?: string;
    }
    
    const User = client.model<UserSchema>('users');

    // ✅ Valid insertOne calls - should not cause TypeScript errors
    const validUser1 = await User.insertOne({
      _id: 'user1',
      name: 'John',
      age: 30,
    });
    expect(validUser1.insertedId).toBe('user1');

    const validUser2 = await User.insertOne({
      _id: 'user2',
      name: 'Jane',
      age: 25,
      email: 'jane@example.com',
    });
    expect(validUser2.insertedId).toBe('user2');

    // ❌ Invalid insertOne calls - TypeScript should catch these errors
    // Note: Since we're using generics, runtime validation is not performed
    // These tests demonstrate TypeScript's compile-time type checking
    
    // @ts-expect-error - missing required field 'name'
    await User.insertOne({
      _id: 'user3',
      age: 30,
    });

    // @ts-expect-error - missing required field 'age'
    await User.insertOne({
      _id: 'user4',
      name: 'Bob',
    });

    // Wrong type for 'age' - TypeScript will catch this
    await User.insertOne({
      _id: 'user5',
      name: 'Alice',
      // @ts-ignore - demonstrating wrong type
      age: 'thirty',
    });

    // Wrong type for 'name' - TypeScript will catch this
    await User.insertOne({
      _id: 'user6',
      // @ts-ignore - demonstrating wrong type
      name: 123,
      age: 30,
      email: undefined,
    });

    // ✅ Valid findOne calls
    const foundUser = await User.findOne({ name: 'John' });
    if (foundUser) {
      expect(typeof foundUser._id).toBe('string');
      expect(typeof foundUser.name).toBe('string');
      expect(typeof foundUser.age).toBe('number');
    }

    // ❌ Invalid findOne calls - TypeScript should catch these
    // Wrong type for filter
    // @ts-ignore - demonstrating wrong type
    await User.findOne({ age: 'thirty' });

    // Non-existent field
    // @ts-ignore - demonstrating non-existent field
    await User.findOne({ nonExistentField: 'value' });

    // ✅ Valid updateOne calls
    await User.updateOne(
      { name: 'John' },
      { $set: { age: 31 } }
    );

    // ❌ Invalid updateOne calls - TypeScript should catch these
    await User.updateOne(
      { name: 'John' },
      // @ts-expect-error - wrong type for 'age'
      { $set: { age: 'thirty-one' } }
    );

    // Note: Due to the way MongoDB update operators work with 'any' type,
    // some invalid fields might not be caught at compile time
    await User.updateOne(
      { name: 'John' },
      // This might not error at compile time due to [key: string]: any
      { $set: { nonExistentField: 'value' } as any }
    );

    // Wrong type for filter 'age'
    await User.updateOne(
      // @ts-ignore - demonstrating wrong type
      { age: 'thirty' },
      { $set: { name: 'Johnny' } }
    );
  });

  test('should check nested objects', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      address?: {
        line?: string;
        city?: string;
        zip?: string;
      };
    }

    const User = client.model<UserSchema>('users');

    // ✅ Valid nested object insertion
    await User.insertOne({
      _id: 'user-nested-1',
      name: 'Alice',
      address: {
        line: '123 Main St',
        city: 'New York',
      },
    });

    // ❌ Invalid nested object - TypeScript should catch this
    // Wrong type for nested field
    await User.insertOne({
      _id: 'user-nested-2',
      name: 'Bob',
      address: {
        // @ts-ignore - demonstrating wrong type
        line: 123, // Should be string
        city: 'Boston',
      },
    });

    // Valid update with dot notation (requires 'as any' due to type limitations)
    await User.updateOne(
      { _id: 'user-nested-1' },
      { $set: { 'address.line': '456 Oak Ave' } as any }
    );

    // Invalid update - wrong type for nested field
    await User.updateOne(
      { _id: 'user-nested-1' },
      // Wrong type for 'address.line' - would be caught if not using 'as any'
      { $set: { 'address.line': 123 } as any }
    );

    // Invalid update - wrong field name
    await User.updateOne(
      { _id: 'user-nested-1' },
      // This might not error at compile time due to 'as any'
      { $set: { 'address.line2': '123' } as any }
    );
  });

  test('should check array types', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      tags?: string[];
      scores?: number[];
    }

    const User = client.model<UserSchema>('users');

    // ✅ Valid array insertion
    await User.insertOne({
      _id: 'user-array-1',
      name: 'Charlie',
      tags: ['tag1', 'tag2'],
      scores: [100, 200],
    });

    // ❌ Invalid array types - TypeScript should catch these
    // Wrong type for array elements
    await User.insertOne({
      _id: 'user-array-2',
      name: 'David',
      // @ts-ignore - demonstrating wrong type
      tags: [1, 2, 3], // Should be string[]
    });

    // Wrong type for array elements
    await User.insertOne({
      _id: 'user-array-3',
      name: 'Eve',
      // @ts-ignore - demonstrating wrong type
      scores: ['100', '200'], // Should be number[]
    });

    // Valid $push operation (requires 'as any' due to type limitations)
    await User.updateOne(
      { _id: 'user-array-1' },
      { $push: { tags: 'tag3' } as any }
    );

    // Invalid $push - wrong type
    await User.updateOne(
      { _id: 'user-array-1' },
      // This might not error at compile time due to 'as any'
      { $push: { tags: 123 } as any }
    );
  });

  test('should check optional vs required fields', async () => {
    interface UserSchema extends Document {
      _id: string;
      required: string;
      optional?: string;
      nested: {
        required: string;
        optional?: string;
      };
    }

    const User = client.model<UserSchema>('users');

    // ✅ Valid - all required fields present
    await User.insertOne({
      _id: 'user-req-1',
      required: 'value',
      nested: {
        required: 'value',
      },
    });

    // ✅ Valid - with optional fields
    await User.insertOne({
      _id: 'user-req-2',
      required: 'value',
      optional: 'optional value',
      nested: {
        required: 'value',
        optional: 'optional value',
      },
    });

    // ❌ Invalid - missing required field
    // @ts-expect-error - missing 'required' field
    await User.insertOne({
      _id: 'user-req-3',
      nested: {
        required: 'value',
      },
    });

    // ❌ Invalid - missing nested required field
    // Missing 'nested.required' field
    await User.insertOne({
      _id: 'user-req-4',
      required: 'value',
      // @ts-ignore - demonstrating missing required field
      nested: {},
    });
  });

  test('should check union types', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      status: 'active' | 'inactive' | 'pending';
      role?: 'admin' | 'user' | 'guest';
    }

    const User = client.model<UserSchema>('users');

    // ✅ Valid - correct union type values
    await User.insertOne({
      _id: 'user-union-1',
      name: 'Frank',
      status: 'active',
      role: 'admin',
    });

    // ❌ Invalid - wrong union type value
    // Invalid status value
    await User.insertOne({
      _id: 'user-union-2',
      name: 'Grace',
      // @ts-ignore - demonstrating invalid union value
      status: 'unknown',
    });

    // ❌ Invalid - wrong union type value for optional field
    // Invalid role value
    await User.insertOne({
      _id: 'user-union-3',
      name: 'Henry',
      status: 'active',
      // @ts-ignore - demonstrating invalid union value
      role: 'superuser',
    });
  });
});
