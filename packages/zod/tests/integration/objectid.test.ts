import type { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { Client } from '@safe-mongo/core';
import { zodAdapter, objectId } from '../../src/index.js';

describe('ObjectId Support', () => {
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

  describe('String _id schema', () => {
    test('should keep _id as string throughout the lifecycle', async () => {
      const userSchema = z.object({
        _id: z.string(),
        name: z.string(),
        age: z.number(),
      });
      const User = client.model('users', zodAdapter(userSchema));

      // Insert with custom string _id
      const customId = 'custom-string-id';
      const doc1 = await User.insertOne({
        _id: customId,
        name: 'John',
        age: 30,
      });

      expect(doc1._id).toBe(customId);
      expect(typeof doc1._id).toBe('string');

      // Find by string _id
      const found = await User.findById(customId);
      expect(found).toBeDefined();
      expect(found?._id).toBe(customId);
      expect(typeof found?._id).toBe('string');

      // Update and verify _id remains string
      await User.updateOne({ _id: customId }, { $set: { age: 31 } });
      const updated = await User.findById(customId);
      expect(updated?._id).toBe(customId);
      expect(typeof updated?._id).toBe('string');
    });

    test('should require string _id when using string schema', async () => {
      const userSchema = z.object({
        _id: z.string(),
        name: z.string(),
        age: z.number(),
      });
      const User = client.model('users', zodAdapter(userSchema));

      // Insert without _id should fail for string schema
      await expect(User.insertOne({
        name: 'Jane',
        age: 25,
      } as any)).rejects.toThrow();

      // Insert with _id should succeed
      const doc = await User.insertOne({
        _id: 'custom-id',
        name: 'Jane',
        age: 25,
      });

      expect(doc._id).toBe('custom-id');
      expect(typeof doc._id).toBe('string');
    });
  });

  describe('ObjectId _id schema', () => {
    test('should handle ObjectId throughout the lifecycle', async () => {
      const userSchema = z.object({
        _id: objectId().optional(),
        name: z.string(),
        age: z.number(),
      });
      const User = client.model('users', zodAdapter(userSchema));

      // Insert without _id (should be optional for ObjectId schemas)
      const doc1 = await User.insertOne({
        name: 'Alice',
        age: 28,
      });

      expect(doc1._id).toBeDefined();
      expect(doc1._id).toBeInstanceOf(ObjectId);

      // Find by ObjectId
      const found = await User.findById(doc1._id);
      expect(found).toBeDefined();
      expect(found?._id).toBeInstanceOf(ObjectId);
      expect(found?._id.toString()).toBe(doc1._id.toString());

      // Find by string (should convert to ObjectId)
      const foundByString = await User.findById(doc1._id.toString());
      expect(foundByString).toBeDefined();
      expect(foundByString?._id).toBeInstanceOf(ObjectId);
      expect(foundByString?._id.toString()).toBe(doc1._id.toString());

      // Update and verify _id remains ObjectId
      await User.updateOne({ _id: doc1._id }, { $set: { age: 29 } });
      const updated = await User.findById(doc1._id);
      expect(updated?._id).toBeInstanceOf(ObjectId);
      expect(updated?.age).toBe(29);
    });

    test('should accept custom ObjectId when provided', async () => {
      const userSchema = z.object({
        _id: objectId().optional(),
        name: z.string(),
        age: z.number(),
      });
      const User = client.model('users', zodAdapter(userSchema));

      const customId = new ObjectId();
      const doc = await User.insertOne({
        _id: customId as any, // Type assertion needed for test
        name: 'Bob',
        age: 35,
      });

      expect(doc._id).toBeInstanceOf(ObjectId);
      expect(doc._id.toString()).toBe(customId.toString());
    });

    test('should convert string to ObjectId when provided', async () => {
      const userSchema = z.object({
        _id: objectId().optional(),
        name: z.string(),
        age: z.number(),
      });
      const User = client.model('users', zodAdapter(userSchema));

      const stringId = new ObjectId().toString();
      const doc = await User.insertOne({
        _id: stringId as any, // Type assertion needed as schema expects ObjectId
        name: 'Charlie',
        age: 40,
      });

      expect(doc._id).toBeInstanceOf(ObjectId);
      expect(doc._id.toString()).toBe(stringId);
    });
  });

  describe('Mixed operations', () => {
    test('should handle different _id types in different collections', async () => {
      // Collection with string _id
      const stringSchema = z.object({
        _id: z.string(),
        type: z.literal('string'),
      });
      const StringModel = client.model('string_ids', zodAdapter(stringSchema));

      // Collection with ObjectId _id
      const objectIdSchema = z.object({
        _id: objectId().optional(),
        type: z.literal('objectid'),
      });
      const ObjectIdModel = client.model('objectid_ids', zodAdapter(objectIdSchema));

      // Insert into both collections
      const stringDoc = await StringModel.insertOne({
        _id: 'string-id-123',
        type: 'string',
      });
      const objectIdDoc = await ObjectIdModel.insertOne({
        type: 'objectid',
      });

      // Verify types
      expect(typeof stringDoc._id).toBe('string');
      expect(objectIdDoc._id).toBeInstanceOf(ObjectId);

      // Find and verify
      const foundString = await StringModel.findById('string-id-123');
      const foundObjectId = await ObjectIdModel.findById(objectIdDoc._id);

      expect(foundString?._id).toBe('string-id-123');
      expect(foundObjectId?._id).toBeInstanceOf(ObjectId);
    });
  });

  describe('Bulk operations', () => {
    test('should handle insertMany with ObjectId schema', async () => {
      const userSchema = z.object({
        _id: objectId().optional(),
        name: z.string(),
      });
      const User = client.model('users', zodAdapter(userSchema));

      const docs = await User.insertMany([
        { name: 'User1' },
        { name: 'User2' },
        { _id: new ObjectId() as any, name: 'User3' }, // Type assertion for test
      ]);

      expect(docs).toHaveLength(3);
      for (const doc of docs) {
        expect(doc._id).toBeInstanceOf(ObjectId);
      }
    });

    test('should handle insertMany with string schema', async () => {
      const userSchema = z.object({
        _id: z.string(),
        name: z.string(),
      });
      const User = client.model('users', zodAdapter(userSchema));

      const docs = await User.insertMany([
        { _id: 'id1', name: 'User1' },
        { _id: 'id2', name: 'User2' },
        { _id: 'id3', name: 'User3' },
      ]);

      expect(docs).toHaveLength(3);
      expect(docs[0]._id).toBe('id1');
      expect(docs[1]._id).toBe('id2');
      expect(docs[2]._id).toBe('id3');
    });
  });
});