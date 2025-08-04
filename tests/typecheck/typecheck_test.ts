import { beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';
// import { Client } from 'mongo-standard-schema';
import { Client, ZodAdapter } from '../../src/index.js';

describe.skip('This is a typecheck test so type check only.', () => {
  let client: Client;

  beforeEach(async () => {
    // Use global test database
    const testDb = (globalThis as any).testDb;
    const zodAdapter = new ZodAdapter();
    client = Client.initialize(testDb, zodAdapter);

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
    const User = client.model('users', userSchema);

    // ✅ Valid insertOne calls - should not cause TypeScript errors
    const validUser1 = await User.insertOne({
      name: 'John',
      age: 30,
    });
    expect(validUser1.name).toBe('John');
    expect(validUser1.age).toBe(30);
    expect(typeof validUser1._id).toBe('string');

    const validUser2 = await User.insertOne({
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
      // @ts-expect-error - wrong type for 'nonExistentField'
      { $set: { nonExistentField: 'value' } }
    );

    await User.updateOne(
      // @ts-expect-error - wrong type for 'age'
      { age: 'thirty' },
      { $set: { name: 'Johnny' } }
    );
  });
});
