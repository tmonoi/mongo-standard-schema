import type { MongoClient } from 'mongodb';
import { beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';
import { Client } from '../../src/index.js';

describe('Sample Code Integration', () => {
  let mongoClient: MongoClient;
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
    console.log('foundDoc result:', foundDoc);
    expect(foundDoc).toBeDefined();
    expect(foundDoc?.name).toBe('John');
    expect(foundDoc?.age).toBe(20);
    expect(foundDoc?._id).toBe(doc1._id);

    // Test findById
    const foundById = await User.findById(doc1._id);
    console.log('foundById result:', foundById);
    console.log('doc1._id:', doc1._id);
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
        age: 'invalid' as any, // Should fail validation
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
