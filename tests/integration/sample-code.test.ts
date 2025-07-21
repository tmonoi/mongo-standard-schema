import type { MongoClient } from 'mongodb';
import { beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';
import { Client } from 'mongo-standard-schema';

describe('Sample Code Integration', () => {
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

  test('should work exactly as documented in the sample', async () => {
    // Define the User schema exactly as in the sample
    const User = client.model(
      'users',
      z.object({
        _id: z.string(),
        name: z.string(),
        age: z.number(),
      }),
    );

    // Test insertOne - _id should be optional
    const doc1 = await User.insertOne({
      name: 'John',
      age: 20,
    });

    expect(doc1).toBeDefined();
    expect(doc1.name).toBe('John');
    expect(doc1.age).toBe(20);
    expect(doc1._id).toBeDefined();
    expect(typeof doc1._id).toBe('string');

    // Test findOne
    const foundDoc = await User.findOne({ name: 'John' });
    expect(foundDoc).toBeDefined();
    expect(foundDoc?.name).toBe('John');
    expect(foundDoc?.age).toBe(20);
    expect(foundDoc?._id).toBe(doc1._id);

    // Test findById
    const foundById = await User.findById(doc1._id);
    expect(foundById).toBeDefined();
    expect(foundById?.name).toBe('John');
    expect(foundById?._id).toBe(doc1._id);

    // Test updateOne
    const updateResult = await User.updateOne({ _id: doc1._id }, { $set: { age: 21 } });
    expect(updateResult.modifiedCount).toBe(1);

    // Verify update
    const updatedDoc = await User.findById(doc1._id);
    expect(updatedDoc?.age).toBe(21);

    // Test findOneAndUpdate
    const doc2 = await User.findOneAndUpdate({ _id: doc1._id }, { $set: { name: 'John Doe' } });
    expect(doc2).toBeDefined();
    expect(doc2?.name).toBe('John Doe');
    expect(doc2?.age).toBe(21);

    // Test deleteOne
    const deleteResult = await User.deleteOne({ _id: doc1._id });
    expect(deleteResult.deletedCount).toBe(1);

    // Verify deletion
    const deletedDoc = await User.findById(doc1._id);
    expect(deletedDoc).toBeNull();
  });

  test('should handle validation correctly', async () => {
    const User = client.model(
      'users',
      z.object({
        _id: z.string(),
        name: z.string(),
        age: z.number(),
      }),
    );

    // Test validation failure
    await expect(
      User.insertOne({
        name: 'John',
        // @ts-expect-error - wrong type for 'age'
        age: 'invalid',
      }),
    ).rejects.toThrow();

    // Test successful validation
    const validDoc = await User.insertOne({
      name: 'Jane',
      age: 25,
    });
    expect(validDoc.name).toBe('Jane');
    expect(validDoc.age).toBe(25);
  });

  test('should provide proper TypeScript type checking', async () => {
    const User = client.model(
      'users',
      z.object({
        _id: z.string(),
        name: z.string(),
        age: z.number(),
        email: z.string().optional(),
      }),
    );

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
    await expect(User.findOne({ age: 'thirty' })).rejects.toThrow();

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

  test('should handle multiple documents', async () => {
    const User = client.model(
      'users',
      z.object({
        _id: z.string(),
        name: z.string(),
        age: z.number(),
      }),
    );

    // Test insertMany
    const docs = await User.insertMany([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 },
    ]);

    expect(docs).toHaveLength(3);
    expect(docs[0]?.name).toBe('Alice');
    expect(docs[1]?.name).toBe('Bob');
    expect(docs[2]?.name).toBe('Charlie');

    // Test find
    const allUsers = await User.find({});
    expect(allUsers).toHaveLength(3);

    // Test find with filter
    const youngUsers = await User.find({ age: { $lt: 30 } });
    expect(youngUsers).toHaveLength(1);
    expect(youngUsers[0]?.name).toBe('Bob');

    // Test countDocuments
    const count = await User.countDocuments({});
    expect(count).toBe(3);

    // Test updateMany
    const updateResult = await User.updateMany({ age: { $gte: 30 } }, { $inc: { age: 1 } });
    expect(updateResult.modifiedCount).toBe(2);

    // Test deleteMany
    const deleteResult = await User.deleteMany({ age: { $gt: 30 } });
    expect(deleteResult.deletedCount).toBe(2);

    const remainingUsers = await User.find({});
    expect(remainingUsers).toHaveLength(1);
    expect(remainingUsers[0]?.name).toBe('Bob');
  });
});
