import { beforeEach, describe, expect, test } from 'vitest';
import type { ObjectId, Document } from 'mongodb';
import { Client } from '../src/index.js';

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
    // Define the User type
    interface UserSchema extends Document {
      _id: string;
      name: string;
      age: number;
    }
    
    const User = client.model<UserSchema>('users');

    // Test insertOne - _id is required for string schema
    const doc1 = await User.insertOne({
      _id: 'user1',
      name: 'John',
      age: 20,
    });

    expect(doc1).toBeDefined();
    expect(doc1.insertedId).toBeDefined();

    // Test findOne
    const foundDoc = await User.findOne({ name: 'John' });
    expect(foundDoc).toBeDefined();
    expect(foundDoc?.name).toBe('John');
    expect(foundDoc?.age).toBe(20);
    expect(foundDoc?._id).toBe('user1');

    // Test findById
    const foundById = await User.findOne({ _id: 'user1' });
    expect(foundById).toBeDefined();
    expect(foundById?.name).toBe('John');
    expect(foundById?._id).toBe('user1');

    // Test updateOne
    const updateResult = await User.updateOne({ _id: 'user1' }, { $set: { age: 21 } });
    expect(updateResult.modifiedCount).toBe(1);

    // Verify update
    const updatedDoc = await User.findOne({ _id: 'user1' });
    expect(updatedDoc?.age).toBe(21);

    // Test findOneAndUpdate
    const doc2 = await User.findOneAndUpdate({ _id: 'user1' }, { $set: { name: 'John Doe' } });
    expect(doc2).toBeDefined();
    expect(doc2?.name).toBe('John Doe');
    expect(doc2?.age).toBe(21);

    // Test deleteOne
    const deleteResult = await User.deleteOne({ _id: 'user1' });
    expect(deleteResult.deletedCount).toBe(1);

    // Verify deletion
    const deletedDoc = await User.findOne({ _id: 'user1' });
    expect(deletedDoc).toBeNull();
  });

  test('should handle multiple documents', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      age: number;
    }
    
    const User = client.model<UserSchema>('users');

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

  test('should handle optional fields', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      age?: number;
      email?: string;
    }
    
    const User = client.model<UserSchema>('users');

    const doc = await User.insertOne({
      _id: 'user6',
      name: 'John',
    });
    expect(doc.insertedId).toBe('user6');

    const foundDoc = await User.findOne({ _id: 'user6' });
    expect(foundDoc?.name).toBe('John');
    expect(foundDoc?.age).toBeUndefined();

    // Test updateOne
    const updateResult = await User.updateOne({ _id: 'user6' }, { $set: { age: 20 } });
    expect(updateResult.modifiedCount).toBe(1);

    // Test findOneAndUpdate
    const updatedDoc = await User.findOneAndUpdate(
      { _id: 'user6' }, 
      { $set: { name: "John Doe" } }, 
      { returnDocument: 'after' }
    );
    expect(updatedDoc?.age).toBe(20);
  });

  test('should handle nested objects', async () => {
    interface UserSchema extends Document {
      _id: string;
      tags: Array<{
        color?: string;
        name: string;
      }>;
    }

    const User = client.model<UserSchema>('users');

    await User.insertOne({
      _id: 'user7',
      tags: [
        { name: 'tag1' },
        { name: 'tag2', color: 'green' },
      ],
    });

    const foundDoc = await User.findOne({ _id: 'user7' });
    expect(foundDoc?.tags).toHaveLength(2);
    expect(foundDoc?.tags[0]?.color).toBeUndefined();
    expect(foundDoc?.tags[1]?.color).toBe('green');

    const updatedDoc = await User.findOneAndUpdate(
      { _id: 'user7' }, 
      { $set: { tags: [{ name: 'tag3', color: 'red' }] } }, 
      { returnDocument: 'after' }
    );
    expect(updatedDoc?.tags).toHaveLength(1);
    expect(updatedDoc?.tags[0]?.color).toBe('red');
    expect(updatedDoc?.tags[0]?.name).toBe('tag3');
  });

  test('should handle nested field updates with dot notation', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      address?: {
        line?: string;
        city?: string;
        zip?: string;
      };
      profile?: {
        bio?: string;
        age?: number;
      };
    }

    const User = client.model<UserSchema>('users');

    // Insert initial document
    await User.insertOne({
      _id: 'user-nested-1',
      name: 'Alice',
      address: {
        line: '123 Main St',
        city: 'New York',
      },
    });

    const foundDoc = await User.findOne({ _id: 'user-nested-1' });
    expect(foundDoc?.address?.line).toBe('123 Main St');
    expect(foundDoc?.address?.city).toBe('New York');

    // Test nested field update with dot notation
    const updateResult = await User.updateOne(
      { _id: 'user-nested-1' },
      { $set: { 'address.line': '456 Oak Ave' } as any }
    );
    expect(updateResult.modifiedCount).toBe(1);

    const updated = await User.findOne({ _id: 'user-nested-1' });
    expect(updated?.address?.line).toBe('456 Oak Ave');
    expect(updated?.address?.city).toBe('New York'); // Other fields should remain

    // MongoDB doesn't validate types on update by default
    // So invalid updates will succeed at runtime
    const invalidUpdate = await User.updateOne(
      { _id: 'user-nested-1' },
      { $set: { 'profile.age': 'invalid' } as any }
    );
    // The update will succeed but the value will be invalid
    expect(invalidUpdate.modifiedCount).toBe(1);

    // Test with document without nested fields
    await User.insertOne({
      _id: 'user-nested-2',
      name: 'Bob',
    });
    
    const foundDoc2 = await User.findOne({ _id: 'user-nested-2' });
    expect(foundDoc2?.address).toBeUndefined();

    // Update nested field that doesn't exist yet
    await User.updateOne(
      { _id: 'user-nested-2' },
      { $set: { 'address.zip': '12345' } as any }
    );
    
    const updated2 = await User.findOne({ _id: 'user-nested-2' });
    expect(updated2?.address?.zip).toBe('12345');
  });

  test('should handle whole object updates', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      address?: {
        line?: string;
        city?: string;
        country?: string;
      };
      metadata?: {
        created?: Date;
        updated?: Date;
      };
    }

    const User = client.model<UserSchema>('users');

    // Insert initial document
    await User.insertOne({
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
      { _id: 'user-object-1' },
      { $set: { address: newAddress } }
    );
    expect(updateResult.modifiedCount).toBe(1);

    const updated = await User.findOne({ _id: 'user-object-1' });
    expect(updated?.address).toEqual(newAddress);

    // MongoDB doesn't validate types on update by default
    // The update will succeed but with invalid types
    const invalidUpdate = await User.updateOne(
      { _id: 'user-object-1' },
      { $set: { address: { line: 123 as any, city: 'Invalid' } } }
    );
    expect(invalidUpdate.modifiedCount).toBe(1);

    // Test with partial object
    const partialAddress = { line: '999 Market St' };
    await User.updateOne(
      { _id: 'user-object-1' },
      { $set: { address: partialAddress } }
    );

    const updated2 = await User.findOne({ _id: 'user-object-1' });
    expect(updated2?.address?.line).toBe('999 Market St');
    expect(updated2?.address?.city).toBeUndefined();
    expect(updated2?.address?.country).toBeUndefined();
  });

  test('should handle $push operator', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      tags?: string[];
      scores?: number[];
      items?: Array<{
        id: string;
        name: string;
        quantity?: number;
      }>;
    }

    const User = client.model<UserSchema>('users');

    // Insert initial document
    await User.insertOne({
      _id: 'user-push-1',
      name: 'David',
      tags: ['initial'],
      scores: [100],
    });

    // Test $push with single value
    await User.updateOne(
      { _id: 'user-push-1' },
      { $push: { tags: 'new-tag' } as any }
    );

    let updated = await User.findOne({ _id: 'user-push-1' });
    expect(updated?.tags).toEqual(['initial', 'new-tag']);

    // Test $push with multiple values using $each
    await User.updateOne(
      { _id: 'user-push-1' },
      { $push: { tags: { $each: ['tag2', 'tag3'] } } as any }
    );

    updated = await User.findOne({ _id: 'user-push-1' });
    expect(updated?.tags).toEqual(['initial', 'new-tag', 'tag2', 'tag3']);

    // Test $push with number array
    await User.updateOne(
      { _id: 'user-push-1' },
      { $push: { scores: 200 } as any }
    );

    updated = await User.findOne({ _id: 'user-push-1' });
    expect(updated?.scores).toEqual([100, 200]);

    // Test $push with object
    const newItem = { id: 'item1', name: 'Item 1', quantity: 5 };
    await User.updateOne(
      { _id: 'user-push-1' },
      { $push: { items: newItem } as any }
    );

    updated = await User.findOne({ _id: 'user-push-1' });
    expect(updated?.items).toHaveLength(1);
    expect(updated?.items?.[0]).toEqual(newItem);

    // Test $push with object without optional fields
    // MongoDB doesn't apply schema defaults on $push operations
    const itemWithoutQuantity = { id: 'item2', name: 'Item 2' };
    await User.updateOne(
      { _id: 'user-push-1' },
      { $push: { items: itemWithoutQuantity } as any }
    );

    updated = await User.findOne({ _id: 'user-push-1' });
    expect(updated?.items).toHaveLength(2);
    // MongoDB doesn't apply defaults on $push, so quantity will be undefined
    expect(updated?.items?.[1]?.quantity).toBeUndefined();

    // MongoDB doesn't validate types on update
    // The update will succeed even with invalid types
    const invalidPush = await User.updateOne(
      { _id: 'user-push-1' },
      { $push: { scores: 'invalid' } as any }
    );
    expect(invalidPush.modifiedCount).toBe(1);
  });

  test('should handle comprehensive update operators', async () => {
    interface UserSchema extends Document {
      _id: string;
      name: string;
      age?: number;
      email?: string;
      score?: number;
      lastLogin?: Date;
      tags?: string[];
      settings?: {
        theme?: string;
        notifications?: boolean;
      };
      counters?: Record<string, number>;
    }

    const User = client.model<UserSchema>('users');

    // Test $set operator
    await User.insertOne({
      _id: 'user-ops-1',
      name: 'Eve',
      age: 25,
      email: 'eve@example.com',
      score: 100,
    });

    await User.updateOne(
      { _id: 'user-ops-1' },
      { $set: { age: 26, email: 'eve.new@example.com' } }
    );

    let updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.age).toBe(26);
    expect(updated?.email).toBe('eve.new@example.com');

    // Test $unset operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $unset: { email: '' } }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.email).toBeUndefined();

    // Test $inc operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $inc: { score: 50 } }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.score).toBe(150);

    // Test $mul operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $mul: { score: 2 } }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.score).toBe(300);

    // Test $min operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $min: { score: 250 } }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.score).toBe(250);

    // Test $max operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $max: { score: 400 } }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.score).toBe(400);

    // Test $currentDate operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $currentDate: { lastLogin: true } }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.lastLogin).toBeInstanceOf(Date);

    // Test $addToSet operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $addToSet: { tags: 'unique1' } as any }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.tags).toEqual(['unique1']);

    // Add same tag again (should not duplicate)
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $addToSet: { tags: 'unique1' } as any }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.tags).toEqual(['unique1']);

    // Test $pull operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $push: { tags: { $each: ['remove-me', 'keep-me'] } } as any }
    );

    await User.updateOne(
      { _id: 'user-ops-1' },
      { $pull: { tags: 'remove-me' } as any }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.tags).toEqual(['unique1', 'keep-me']);

    // Test $pop operator (remove last element)
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $pop: { tags: 1 } as any }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.tags).toEqual(['unique1']);

    // Test $rename operator
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $rename: { age: 'yearsOld' } as any }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
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
      { _id: 'user-ops-1' },
      { $set: { 'settings.theme': 'dark' } as any }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.settings?.theme).toBe('dark');

    // Test record/map field updates
    await User.updateOne(
      { _id: 'user-ops-1' },
      { $set: { 'counters.visits': 1 } as any }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.counters?.visits).toBe(1);

    await User.updateOne(
      { _id: 'user-ops-1' },
      { $inc: { 'counters.visits': 1 } as any }
    );

    updated = await User.findOne({ _id: 'user-ops-1' });
    expect(updated?.counters?.visits).toBe(2);
  });

  test('should handle ObjectId type', async () => {
    interface UserSchema extends Document {
      _id?: ObjectId;
      name: string;
      age: number;
    }
    
    const User = client.model<UserSchema>('users');

    // Test insertOne without _id (should auto-generate ObjectId)
    const doc1 = await User.insertOne({
      name: 'John',
      age: 20,
    });

    expect(doc1).toBeDefined();
    expect(doc1.insertedId).toBeDefined();

    // Test findOne with auto-generated ObjectId
    const foundDoc = await User.findOne({ name: 'John' });
    expect(foundDoc).toBeDefined();
    expect(foundDoc?.name).toBe('John');
    expect(foundDoc?.age).toBe(20);
    expect(foundDoc?._id).toBeDefined();

    // Test updateOne with ObjectId
    const updateResult = await User.updateOne({ name: 'John' }, { $set: { age: 21 } });
    expect(updateResult.modifiedCount).toBe(1);

    // Verify update
    const updatedDoc = await User.findOne({ name: 'John' });
    expect(updatedDoc?.age).toBe(21);
  });
});