import { beforeEach, describe, expect, test } from 'vitest';
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
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      age: z.number(),
      email: z.string().optional(),
    });
    const User = client.model('users', zodAdapter(userSchema));

    // ✅ Valid insertOne calls - should not cause TypeScript errors
    const validUser1 = await User.insertOne({
      _id: 'user1',
      name: 'John',
      age: 30,
    });
    expect(validUser1.name).toBe('John');
    expect(validUser1.age).toBe(30);
    expect(typeof validUser1._id).toBe('string');

    const validUser2 = await User.insertOne({
      _id: 'user2',
      name: 'Jane',
      age: 25,
      email: 'jane@example.com',
    });
    expect(validUser2.email).toBe('jane@example.com');

    // ❌ Invalid insertOne calls - should cause TypeScript errors and runtime validation errors
    // @ts-expect-error - missing required field 'name'
    await expect(User.insertOne({
      age: 30,
    })).rejects.toThrow();

    // @ts-expect-error - missing required field 'age'
    await expect(User.insertOne({
      name: 'Bob',
    })).rejects.toThrow();

    await expect(User.insertOne({
      name: 'Alice',
      // @ts-expect-error - wrong type for 'age'
      age: 'thirty',
    })).rejects.toThrow();

    await expect(User.insertOne({
      // @ts-expect-error - wrong type for 'name'
      name: 123,
      age: 30,
      email: undefined,
    })).rejects.toThrow();

    // ✅ Valid findOne calls
    const foundUser = await User.findOne({ name: 'John' });
    if (foundUser) {
      expect(typeof foundUser._id).toBe('string');
      expect(typeof foundUser.name).toBe('string');
      expect(typeof foundUser.age).toBe('number');
    }

    // ❌ Invalid findOne calls - should cause TypeScript errors
    // @ts-expect-error - wrong type for filter
    const invalidFind = await User.findOne({ age: 'thirty' });
    expect(invalidFind).toBeNull();

    // @ts-expect-error - non-existent field
    // Note: MongoDB allows queries with non-existent fields, so this returns null instead of throwing
    const nonExistentResult = await User.findOne({ nonExistentField: 'value' });
    expect(nonExistentResult).toBeNull();

    // ✅ Valid updateOne calls
    await User.updateOne(
      { name: 'John' },
      { $set: { age: 31 } }
    );

    await User.updateOne(
      { name: 'John' },
      // @ts-expect-error - wrong type for 'age'
      { $set: { age: 'thirty-one' } }
    );

    await User.updateOne(
      { name: 'John' },
      // Now allows any field due to [key: string]: any
      { $set: { nonExistentField: 'value' } }
    );

    await User.updateOne(
      // @ts-expect-error - wrong type for 'age'
      { age: 'thirty' },
      { $set: { name: 'Johnny' } }
    );
  });

  test('should check nested objects', async () => {
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      address: z.object({
        line: z.string().default(''),
        city: z.string().default('Tokyo'),
        zip: z.string().optional(),
      }).default(() => ({ line: '', city: 'Tokyo' })),
    });

    const User = client.model('users', zodAdapter(userSchema));

    await User.updateOne(
      { _id: 'user-nested-1' },
      // valid update
      { $set: { 'address.line': '456 Oak Ave' } }
    );

    await expect(User.updateOne(
      { _id: 'user-nested-1' },
      // @ts-expect-error - wrong type for 'address.line'
      { $set: { 'address.line': 123 } }
    )).rejects.toThrow();

    await expect(User.updateOne(
      { _id: 'user-nested-1' },
      // @ts-expect-error - wrong field name
      { $set: { 'address.line2': '123' } }
    )).rejects.toThrow();
  });
});
