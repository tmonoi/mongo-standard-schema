import { beforeEach, describe, expect, test } from 'vitest';
import * as v from 'valibot';
import { Client, valibotAdapterFactory } from '../../src/index.js';

describe('Valibot Integration', () => {
  let client: Client;

  beforeEach(async () => {
    // Use global test database
    const testDb = (globalThis as any).testDb;
    client = Client.initialize(testDb, valibotAdapterFactory);

    // Clear collections before each test
    const collections = await testDb.listCollections().toArray();
    for (const collection of collections) {
      await testDb.collection(collection.name).deleteMany({});
    }
  });

  test('should work with Valibot schemas', async () => {
    // Define the User schema with Valibot
    const userSchema = v.object({
      _id: v.string(),
      name: v.string(),
      age: v.pipe(v.number(), v.minValue(0)),
      email: v.pipe(v.string(), v.email()),
    });

    const User = client.model('users', userSchema);

    // Test insertOne - _id should be optional
    const doc1 = await User.insertOne({
      name: 'John',
      age: 20,
      email: 'john@example.com',
    });

    expect(doc1).toBeDefined();
    expect(doc1.name).toBe('John');
    expect(doc1.age).toBe(20);
    expect(doc1.email).toBe('john@example.com');
    expect(doc1._id).toBeDefined();
    expect(typeof doc1._id).toBe('string');

    // Test findOne
    const foundDoc = await User.findOne({ name: 'John' });
    expect(foundDoc).toBeDefined();
    expect(foundDoc?.name).toBe('John');
    expect(foundDoc?.age).toBe(20);
    expect(foundDoc?._id).toBe(doc1._id);

    // Test updateOne
    const updateResult = await User.updateOne({ _id: doc1._id }, { $set: { age: 21 } });
    expect(updateResult.modifiedCount).toBe(1);

    // Verify update
    const updatedDoc = await User.findById(doc1._id);
    expect(updatedDoc?.age).toBe(21);
  });

  test('should handle Valibot validation correctly', async () => {
    const userSchema = v.object({
      _id: v.string(),
      name: v.string(),
      age: v.pipe(v.number(), v.minValue(0)),
      email: v.pipe(v.string(), v.email()),
    });

    const User = client.model('users', userSchema);

    // Test validation failure - negative age
    await expect(
      User.insertOne({
        name: 'John',
        age: -5,
        email: 'john@example.com',
      }),
    ).rejects.toThrow();

    // Test validation failure - invalid email
    await expect(
      User.insertOne({
        name: 'John',
        age: 20,
        email: 'not-an-email',
      }),
    ).rejects.toThrow();

    // Test successful validation
    const validDoc = await User.insertOne({
      name: 'Jane',
      age: 25,
      email: 'jane@example.com',
    });
    expect(validDoc.name).toBe('Jane');
    expect(validDoc.age).toBe(25);
    expect(validDoc.email).toBe('jane@example.com');
  });

  test('should handle default values with Valibot', async () => {
    const userSchema = v.object({
      _id: v.string(),
      name: v.string(),
      age: v.optional(v.pipe(v.number(), v.minValue(0)), 18),
      status: v.optional(v.string(), 'active'),
    });

    const User = client.model('users', userSchema);

    const doc = await User.insertOne({
      name: 'John',
    });
    
    expect(doc.age).toBe(18);
    expect(doc.status).toBe('active');
  });

  test('should handle complex schemas with Valibot', async () => {
    const addressSchema = v.object({
      street: v.string(),
      city: v.string(),
      zipCode: v.pipe(v.string(), v.regex(/^\d{5}$/)),
    });

    const userSchema = v.object({
      _id: v.string(),
      name: v.string(),
      addresses: v.array(addressSchema),
      tags: v.optional(v.array(v.string()), []),
      metadata: v.optional(v.record(v.string(), v.unknown())),
    });

    const User = client.model('users', userSchema);

    const doc = await User.insertOne({
      name: 'John',
      addresses: [
        {
          street: '123 Main St',
          city: 'New York',
          zipCode: '10001',
        },
      ],
      tags: ['customer', 'premium'],
      metadata: {
        source: 'web',
        referrer: 'google',
      },
    });

    expect(doc.addresses).toHaveLength(1);
    expect(doc.addresses[0]?.zipCode).toBe('10001');
    expect(doc.tags).toEqual(['customer', 'premium']);
    expect(doc.metadata?.source).toBe('web');

    // Test invalid zipCode
    await expect(
      User.insertOne({
        name: 'Jane',
        addresses: [
          {
            street: '456 Oak Ave',
            city: 'Boston',
            zipCode: 'invalid', // Should be 5 digits
          },
        ],
      }),
    ).rejects.toThrow();
  });

  test('should handle union types with Valibot', async () => {
    const userSchema = v.object({
      _id: v.string(),
      name: v.string(),
      role: v.union([
        v.literal('admin'),
        v.literal('user'),
        v.literal('guest'),
      ]),
    });

    const User = client.model('users', userSchema);

    const adminUser = await User.insertOne({
      name: 'Admin',
      role: 'admin',
    });
    expect(adminUser.role).toBe('admin');

    // Test invalid role
    await expect(
      User.insertOne({
        name: 'Invalid',
        role: 'superuser' as any,
      }),
    ).rejects.toThrow();
  });

  test('should work with multiple collections using Valibot', async () => {
    const userSchema = v.object({
      _id: v.string(),
      name: v.string(),
      email: v.pipe(v.string(), v.email()),
    });

    const postSchema = v.object({
      _id: v.string(),
      title: v.string(),
      content: v.string(),
      authorId: v.string(),
      createdAt: v.pipe(v.string(), v.isoTimestamp()),
    });

    const User = client.model('users', userSchema);
    const Post = client.model('posts', postSchema);

    // Create a user
    const user = await User.insertOne({
      name: 'John Doe',
      email: 'john@example.com',
    });

    // Create a post
    const post = await Post.insertOne({
      title: 'My First Post',
      content: 'Hello, world!',
      authorId: user._id,
      createdAt: new Date().toISOString(),
    });

    expect(post.authorId).toBe(user._id);

    // Find posts by author
    const userPosts = await Post.find({ authorId: user._id });
    expect(userPosts).toHaveLength(1);
    expect(userPosts[0]?.title).toBe('My First Post');
  });
});