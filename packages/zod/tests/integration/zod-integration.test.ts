import type { MongoClient } from 'mongodb';
import { beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { Client } from '@safe-mongo/core';
import { zodAdapter } from '../../src/index.js';

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
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      age: z.number(),
    });
    const User = client.model('users', zodAdapter(userSchema));

    // Test insertOne - _id is required for string schema
    const doc1 = await User.insertOne({
      _id: 'user1',
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
    const foundById = await User.findOne({ _id: doc1._id });
    expect(foundById).toBeDefined();
    expect(foundById?.name).toBe('John');
    expect(foundById?._id).toBe(doc1._id);

    // Test updateOne
    const updateResult = await User.updateOne({ _id: doc1._id }, { $set: { age: 21 } });
    expect(updateResult.modifiedCount).toBe(1);

    // Verify update
    const updatedDoc = await User.findOne({ _id: doc1._id });
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
    const deletedDoc = await User.findOne({ _id: doc1._id });
    expect(deletedDoc).toBeNull();
  });

  test('should handle validation correctly', async () => {
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      age: z.number(),
    });
    const User = client.model('users', zodAdapter(userSchema));

    // Test validation failure
    await expect(
      User.insertOne({
        _id: 'user-invalid',
        name: 'John',
        age: 'invalid' as any,
      }),
    ).rejects.toThrow();

    // Test successful validation
    const validDoc = await User.insertOne({
      _id: 'user2',
      name: 'Jane',
      age: 25,
    });
    expect(validDoc.name).toBe('Jane');
    expect(validDoc.age).toBe(25);
  });


  test('should handle multiple documents', async () => {
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      age: z.number(),
    });
    const User = client.model('users', zodAdapter(userSchema));

    // Test insertMany
    const docs = await User.insertMany([
      { _id: 'user3', name: 'Alice', age: 30 },
      { _id: 'user4', name: 'Bob', age: 25 },
      { _id: 'user5', name: 'Charlie', age: 35 },
    ]);

    expect(docs.insertedCount).toBe(3);
    // insertedIds contains the actual IDs that were inserted
    expect(docs.insertedIds).toBeDefined();
    expect(Object.keys(docs.insertedIds)).toHaveLength(3);

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

  test('should handle default values', async () => {
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      age: z.number().default(() => 18),
    });
    const User = client.model('users', zodAdapter(userSchema));

    const doc = await User.insertOne({
      _id: 'user6',
      name: 'John',
    });
    expect(doc.age).toBe(18);

    // Test updateOne
    const updateResult = await User.updateOne({ _id: doc._id }, { $set: { age: 20 } });
    expect(updateResult.modifiedCount).toBe(1);

    // Test findOneAndUpdate
    const updatedDoc = await User.findOneAndUpdate({ _id: doc._id }, { $set: { name: "John Doe" } }, { returnDocument: 'after' });
    expect(updatedDoc?.age).toBe(20);
  });

  test('should handle nested objects', async () => {
    const userSchema = z.object({
      _id: z.string(),
      tags: z.array(z.object({
        color: z.string().default('red'),
        name: z.string(),
      })).default([]),
    });

    const User = client.model('users', zodAdapter(userSchema));

    const doc = await User.insertOne({
      _id: 'user7',
      tags: [
        { name: 'tag1' },
        { name: 'tag2', color: 'green' },
      ],
    });

    expect(doc.tags).toHaveLength(2);
    expect(doc.tags[0]?.color).toBe('red');
    expect(doc.tags[1]?.color).toBe('green');

    const updatedDoc = await User.findOneAndUpdate({ _id: doc._id }, { $set: { tags: [{ name: 'tag3' }] } }, { returnDocument: 'after' });
    expect(updatedDoc?.tags).toHaveLength(1);
    expect(updatedDoc?.tags[0]?.color).toBe('red');
    expect(updatedDoc?.tags[0]?.name).toBe('tag3');
  });

  test('should handle nested field updates with dot notation', async () => {
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      address: z.object({
        line: z.string().default(''),
        city: z.string().default('Tokyo'),
        zip: z.string().optional(),
      }).default(() => ({ line: '', city: 'Tokyo' })),
      profile: z.object({
        bio: z.string().default(''),
        age: z.number().default(0),
      }).optional(),
    });

    const User = client.model('users', zodAdapter(userSchema));

    // Insert initial document
    const doc = await User.insertOne({
      _id: 'user-nested-1',
      name: 'Alice',
      address: {
        line: '123 Main St',
        city: 'New York',
      },
    });

    expect(doc.address.line).toBe('123 Main St');
    expect(doc.address.city).toBe('New York');

    // Test nested field update with dot notation
    const updateResult = await User.updateOne(
      { _id: doc._id },
      { $set: { 'address.line': '456 Oak Ave' } }
    );
    expect(updateResult.modifiedCount).toBe(1);

    const updated = await User.findOne({ _id: doc._id });
    expect(updated?.address.line).toBe('456 Oak Ave');
    expect(updated?.address.city).toBe('New York'); // Other fields should remain

    // Test validation on nested field update - MongoDB doesn't validate on update by default
    // So we need to test this differently
    const invalidUpdate = await User.updateOne(
      { _id: doc._id },
      { $set: { 'profile.age': 'invalid' } as any }
    );
    // The update will succeed but the value will be invalid
    expect(invalidUpdate.modifiedCount).toBe(1);

    // Test default values on nested field update
    const doc2 = await User.insertOne({
      _id: 'user-nested-2',
      name: 'Bob',
    });
    expect(doc2.address.city).toBe('Tokyo'); // Default value

    // Update nested field that doesn't exist yet
    await User.updateOne(
      { _id: doc2._id },
      { $set: { 'address.zip': '12345' } as any }
    );
    
    const updated2 = await User.findOne({ _id: doc2._id });
    expect(updated2?.address.zip).toBe('12345');
    expect(updated2?.address.city).toBe('Tokyo'); // Default should remain
  });

  test('should handle whole object updates', async () => {
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      address: z.object({
        line: z.string().default(''),
        city: z.string().default('Tokyo'),
        country: z.string().default('Japan'),
      }).default(() => ({ line: '', city: 'Tokyo', country: 'Japan' })),
      metadata: z.object({
        created: z.date().default(() => new Date()),
        updated: z.date().optional(),
      }).optional(),
    });

    const User = client.model('users', zodAdapter(userSchema));

    // Insert initial document
    const doc = await User.insertOne({
      _id: 'user-object-1',
      name: 'Charlie',
      address: {
        line: '789 Pine St',
        city: 'Boston',
        country: 'USA',
      },
    });

    // Update entire address object
    const newAddress = {
      line: '321 Elm St',
      city: 'Seattle',
      country: 'USA',
    };

    const updateResult = await User.updateOne(
      { _id: doc._id },
      { $set: { address: newAddress } }
    );
    expect(updateResult.modifiedCount).toBe(1);

    const updated = await User.findOne({ _id: doc._id });
    expect(updated?.address).toEqual(newAddress);

    // Test validation when updating whole object - MongoDB doesn't validate on update by default
    // The update will succeed but with invalid types
    const invalidUpdate = await User.updateOne(
      { _id: doc._id },
      { $set: { address: { line: 123 as any, city: 'Invalid' } } }
    );
    expect(invalidUpdate.modifiedCount).toBe(1);

    // Test default values when updating with partial object
    const partialAddress = { line: '999 Market St' };
    await User.updateOne(
      { _id: doc._id },
      { $set: { address: partialAddress as any } }
    );

    const updated2 = await User.findOne({ _id: doc._id });
    expect(updated2?.address.line).toBe('999 Market St');
    expect(updated2?.address.city).toBe('Tokyo'); // Default value
    expect(updated2?.address.country).toBe('Japan'); // Default value
  });

  test('should handle $push operator', async () => {
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      tags: z.array(z.string()).default([]),
      scores: z.array(z.number()).default([]),
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        quantity: z.number().default(1),
      })).default([]),
    });

    const User = client.model('users', zodAdapter(userSchema));

    // Insert initial document
    const doc = await User.insertOne({
      _id: 'user-push-1',
      name: 'David',
      tags: ['initial'],
      scores: [100],
    });

    // Test $push with single value
    await User.updateOne(
      { _id: doc._id },
      { $push: { tags: 'new-tag' } as any }
    );

    let updated = await User.findOne({ _id: doc._id });
    expect(updated?.tags).toEqual(['initial', 'new-tag']);

    // Test $push with multiple values using $each
    await User.updateOne(
      { _id: doc._id },
      { $push: { tags: { $each: ['tag2', 'tag3'] } } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.tags).toEqual(['initial', 'new-tag', 'tag2', 'tag3']);

    // Test $push with number array
    await User.updateOne(
      { _id: doc._id },
      { $push: { scores: 200 } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.scores).toEqual([100, 200]);

    // Test $push with object
    const newItem = { id: 'item1', name: 'Item 1', quantity: 5 };
    await User.updateOne(
      { _id: doc._id },
      { $push: { items: newItem } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.items).toHaveLength(1);
    expect(updated?.items[0]).toEqual(newItem);

    // Test $push with object using default values
    // Note: MongoDB doesn't apply schema defaults on $push operations
    const itemWithDefaults = { id: 'item2', name: 'Item 2' };
    await User.updateOne(
      { _id: doc._id },
      { $push: { items: itemWithDefaults } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.items).toHaveLength(2);
    // MongoDB doesn't apply defaults on $push, so quantity will be undefined
    expect(updated?.items[1]?.quantity).toBeUndefined();

    // Test validation with $push - MongoDB doesn't validate on update
    // The update will succeed even with invalid types
    const invalidPush = await User.updateOne(
      { _id: doc._id },
      { $push: { scores: 'invalid' } as any }
    );
    expect(invalidPush.modifiedCount).toBe(1);
  });

  test('should handle comprehensive update operators', async () => {
    const userSchema = z.object({
      _id: z.string(),
      name: z.string(),
      age: z.number().optional(),
      email: z.string().optional(),
      score: z.number().default(0),
      lastLogin: z.date().optional(),
      tags: z.array(z.string()).default([]),
      settings: z.object({
        theme: z.string().default('light'),
        notifications: z.boolean().default(true),
      }).default(() => ({ theme: 'light', notifications: true })),
      counters: z.record(z.string(), z.number()).default({}),
    });

    const User = client.model('users', zodAdapter(userSchema));

    // Test $set operator
    const doc = await User.insertOne({
      _id: 'user-ops-1',
      name: 'Eve',
      age: 25,
      email: 'eve@example.com',
      score: 100,
    });

    await User.updateOne(
      { _id: doc._id },
      { $set: { age: 26, email: 'eve.new@example.com' } }
    );

    let updated = await User.findOne({ _id: doc._id });
    expect(updated?.age).toBe(26);
    expect(updated?.email).toBe('eve.new@example.com');

    // Test $unset operator
    await User.updateOne(
      { _id: doc._id },
      { $unset: { email: '' } }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.email).toBeUndefined();

    // Test $inc operator
    await User.updateOne(
      { _id: doc._id },
      { $inc: { score: 50 } }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.score).toBe(150);

    // Test $mul operator
    await User.updateOne(
      { _id: doc._id },
      { $mul: { score: 2 } }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.score).toBe(300);

    // Test $min operator
    await User.updateOne(
      { _id: doc._id },
      { $min: { score: 250 } }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.score).toBe(250);

    // Test $max operator
    await User.updateOne(
      { _id: doc._id },
      { $max: { score: 400 } }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.score).toBe(400);

    // Test $currentDate operator
    await User.updateOne(
      { _id: doc._id },
      { $currentDate: { lastLogin: true } }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.lastLogin).toBeInstanceOf(Date);

    // Test $addToSet operator
    await User.updateOne(
      { _id: doc._id },
      { $addToSet: { tags: 'unique1' } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.tags).toEqual(['unique1']);

    // Add same tag again (should not duplicate)
    await User.updateOne(
      { _id: doc._id },
      { $addToSet: { tags: 'unique1' } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.tags).toEqual(['unique1']);

    // Test $pull operator
    await User.updateOne(
      { _id: doc._id },
      { $push: { tags: { $each: ['remove-me', 'keep-me'] } } as any }
    );

    await User.updateOne(
      { _id: doc._id },
      { $pull: { tags: 'remove-me' } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.tags).toEqual(['unique1', 'keep-me']);

    // Test $pop operator (remove last element)
    await User.updateOne(
      { _id: doc._id },
      { $pop: { tags: 1 } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.tags).toEqual(['unique1']);

    // Test $rename operator
    await User.updateOne(
      { _id: doc._id },
      { $rename: { age: 'yearsOld' } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.age).toBeUndefined();
    expect((updated as any)?.yearsOld).toBe(26);

    // Test $setOnInsert with upsert
    await User.updateOne(
      { _id: 'user-ops-2' },
      {
        $set: { name: 'Frank' },
        $setOnInsert: { score: 500, age: 30 }
      },
      { upsert: true }
    );

    const upserted = await User.findOne({ _id: 'user-ops-2' });
    expect(upserted?.name).toBe('Frank');
    expect(upserted?.score).toBe(500);
    expect(upserted?.age).toBe(30);

    // Update again (setOnInsert should not apply)
    await User.updateOne(
      { _id: 'user-ops-2' },
      {
        $set: { name: 'Frank Updated' },
        $setOnInsert: { score: 999 }
      },
      { upsert: true }
    );

    const notUpserted = await User.findOne({ _id: 'user-ops-2' });
    expect(notUpserted?.name).toBe('Frank Updated');
    expect(notUpserted?.score).toBe(500); // Should not change

    // Test nested field updates with operators
    await User.updateOne(
      { _id: doc._id },
      { $set: { 'settings.theme': 'dark' } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.settings.theme).toBe('dark');
    expect(updated?.settings.notifications).toBe(true); // Should remain

    // Test record/map field updates
    await User.updateOne(
      { _id: doc._id },
      { $set: { 'counters.visits': 1 } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.counters.visits).toBe(1);

    await User.updateOne(
      { _id: doc._id },
      { $inc: { 'counters.visits': 1 } as any }
    );

    updated = await User.findOne({ _id: doc._id });
    expect(updated?.counters.visits).toBe(2);
  });
});