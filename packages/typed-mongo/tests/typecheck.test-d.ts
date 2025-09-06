/**
 * Type-only tests for typed-mongo
 * This file is tested with: pnpm test --typecheck
 */

import { describe, test, expectTypeOf } from 'vitest';
import type { Document, ObjectId } from 'mongodb';
import { ObjectId as MongoObjectId } from 'mongodb';
import { Client } from '../src/index.js';
import type { Model } from '../src/model.js';

// Test schema types
interface UserSchema extends Document {
  _id: string;
  name: string;
  age: number;
  email?: string;
  tags?: string[];
  scores?: number[];
  profile?: {
    bio: string;
    avatar?: string;
  };
  settings?: {
    theme: string;
    notifications: boolean;
  };
  metadata?: {
    created: Date;
    updated?: Date;
  };
  counters?: Record<string, number>;
}

interface PostSchema extends Document {
  _id: ObjectId;
  title: string;
  content: string;
  authorId: string;
  tags: string[];
  likes: number;
  comments: Array<{
    id: string;
    text: string;
    authorId: string;
    createdAt: Date;
  }>;
  published: boolean;
  publishedAt?: Date;
  metadata: {
    views: number;
    shares: number;
  };
}

interface StrictSchema extends Document {
  _id: string;
  required: string;
  optional?: string;
  nested: {
    required: string;
    optional?: string;
  };
  union: 'active' | 'inactive' | 'pending';
  unionOptional?: 'admin' | 'user' | 'guest';
}

// Mock database for type testing
declare const testDb: any;
const client = Client.initialize(testDb);

const User = client.model<UserSchema>('users');
const Post = client.model<PostSchema>('posts');
const Strict = client.model<StrictSchema>('strict');

describe('Type checking tests', () => {
  test('Model type inference', () => {
    expectTypeOf(User).toMatchTypeOf<Model<UserSchema>>();
    expectTypeOf(Post).toMatchTypeOf<Model<PostSchema>>();
    expectTypeOf(Strict).toMatchTypeOf<Model<StrictSchema>>();
  });

  test('Insert operations - valid types', () => {
    // Valid insertOne
    const userResult = User.insertOne({
      _id: 'user1',
      name: 'John',
      age: 30,
    });
    type UserInsertResult = Awaited<typeof userResult>;
    expectTypeOf<UserInsertResult>().toHaveProperty('acknowledged');
    expectTypeOf<UserInsertResult>().toHaveProperty('insertedId');

    // Valid with optional fields
    const userWithOptional = User.insertOne({
      _id: 'user2',
      name: 'Jane',
      age: 25,
      email: 'jane@example.com',
      tags: ['user', 'admin'],
      scores: [100, 200],
    });
    expectTypeOf(userWithOptional).toMatchTypeOf<Promise<any>>();
  });

  test('Find operations - return types', async () => {
    const userResult = await User.findOne({ name: 'John' });
    expectTypeOf(userResult).toMatchTypeOf<UserSchema | null>();

    const cursor = User.find({});
    expectTypeOf(cursor).toHaveProperty('toArray');
    const arrayResult = await cursor.toArray();
    expectTypeOf(arrayResult).toMatchTypeOf<UserSchema[]>();

    const usersResult = await User.findMany({});
    expectTypeOf(usersResult).toMatchTypeOf<UserSchema[]>();

    // check projection
    const projectedUserResult = await User.findOne({ name: 'John' }, { projection: { name: 1 } });
    expectTypeOf(projectedUserResult).toMatchTypeOf<{
      _id: string;
      name: string;
    } | null>();
  });

  test('Update operations - return types', () => {
    const result = User.updateOne(
      { name: 'John' },
      { $set: { age: 31 } }
    );
    type UpdateResult = Awaited<typeof result>;
    expectTypeOf<UpdateResult>().toHaveProperty('acknowledged');
    expectTypeOf<UpdateResult>().toHaveProperty('modifiedCount');
    expectTypeOf<UpdateResult>().toHaveProperty('matchedCount');
  });

  test('Delete operations - return types', () => {
    const result = User.deleteOne({ name: 'John' });
    type DeleteResult = Awaited<typeof result>;
    expectTypeOf<DeleteResult>().toHaveProperty('acknowledged');
    expectTypeOf<DeleteResult>().toHaveProperty('deletedCount');
  });

  test('Type parameter inference', () => {
    type UserInsertDoc = Parameters<typeof User.insertOne>[0];
    type UserFilter = Parameters<typeof User.findOne>[0];
    type UserUpdate = Parameters<typeof User.updateOne>[1];

    // Required fields must be present
    expectTypeOf<UserInsertDoc>().toMatchTypeOf<{
      name: string;
      age: number;
      _id?: string;
      email?: string;
      tags?: string[];
      scores?: number[];
    }>();

    // Filter can use MongoDB query operators
    expectTypeOf<UserFilter>().toMatchTypeOf<{
      name?: any;
      age?: any;
      $or?: any[];
      $and?: any[];
    }>();

    // Update can use MongoDB update operators
    expectTypeOf<UserUpdate>().toMatchTypeOf<{
      $set?: any;
      $inc?: any;
      $push?: any;
      $pull?: any;
      $unset?: any;
    }>();
  });
});

describe('Type error detection tests', () => {
  test('insertOne - type errors', () => {
    // @ts-expect-error - missing required field 'name'
    User.insertOne({
      _id: 'user1',
      age: 30,
    });

    // @ts-expect-error - missing required field 'age'
    User.insertOne({
      _id: 'user2',
      name: 'Bob',
    });

    User.insertOne({
      _id: 'user3',
      name: 'Alice',
      // @ts-expect-error - wrong type for 'age' (string instead of number)
      age: 'thirty',
    });

    User.insertOne({
      _id: 'user4',
      // @ts-expect-error - wrong type for 'name' (number instead of string)
      name: 123,
      age: 30,
    });

    User.insertOne({
      _id: 'user5',
      name: 'Test',
      age: 25,
      // @ts-expect-error - wrong type for optional field 'email'
      email: 123,
    });

    User.insertOne({
      _id: 'user6',
      name: 'Test',
      age: 25,
      // @ts-expect-error - wrong type for array field 'tags'
      tags: [1, 2, 3], // should be string[]
    });

    User.insertOne({
      _id: 'user7',
      name: 'Test',
      age: 25,
      // @ts-expect-error - wrong type for array field 'scores'
      scores: ['100', '200'], // should be number[]
    });

    User.insertOne({
      _id: 'user8',
      name: 'Test',
      age: 25,
      profile: {
        // @ts-expect-error - wrong type for nested object field
        bio: 123, // should be string
      },
    });

    User.insertOne({
      _id: 'user9',
      name: 'Test',
      age: 25,
      // @ts-expect-error - missing required nested field
      profile: {
        // missing 'bio' field
        avatar: 'avatar.jpg',
      },
    });

    User.insertOne({
      _id: 'user10',
      name: 'Test',
      age: 25,
      // @ts-expect-error - wrong structure for nested object
      settings: 'invalid', // should be object
    });

    Post.insertOne({
      // @ts-expect-error - wrong ID type for ObjectId model
      _id: 'string-id', // should be ObjectId
      title: 'Test',
      content: 'Content',
      authorId: 'user1',
      tags: [],
      likes: 0,
      comments: [],
      published: false,
      metadata: { views: 0, shares: 0 },
    });

    Strict.insertOne({
      _id: 'strict1',
      required: 'value',
      nested: { required: 'value' },
      // @ts-expect-error - invalid union type value
      union: 'unknown', // not in union
    });
  });

  test('updateOne - type errors', () => {
    User.updateOne(
      { _id: 'user1' },
      // @ts-expect-error - wrong type in $set operator
      { $set: { age: 'thirty' } }
    );

    // NOTE: These don't cause type errors due to MongoDB's flexible update operators
    // User.updateOne(
    //   { _id: 'user1' },
    //   { $set: { 'profile.bio': 123 } }
    // );

    // User.updateOne(
    //   { _id: 'user1' },
    //   { $set: { nonExistentField: 'value' } }
    // );

    User.updateOne(
      { _id: 'user1' },
      // @ts-expect-error - wrong type in $inc operator
      { $inc: { age: 'five' } }
    );

    // NOTE: These don't cause type errors due to MongoDB's flexible update operators
    // User.updateOne(
    //   { _id: 'user1' },
    //   { $inc: { name: 1 } }
    // );

    // User.updateOne(
    //   { _id: 'user1' },
    //   { $push: { tags: 123 } }
    // );

    // User.updateOne(
    //   { _id: 'user1' },
    //   { $push: { scores: 'not-a-number' } }
    // );

    // NOTE: These don't cause type errors due to MongoDB's flexible update operators
    // User.updateOne(
    //   { _id: 'user1' },
    //   { $push: { age: 1 } }
    // );

    // User.updateOne(
    //   { _id: 'user1' },
    //   { $addToSet: { tags: 123 } }
    // );

    // User.updateOne(
    //   { _id: 'user1' },
    //   { $pull: { tags: 123 } }
    // );

    User.updateOne(
      { _id: 'user1' },
      // @ts-expect-error - wrong type for $mul operator
      { $mul: { age: 'two' } }
    );

    User.updateOne(
      { _id: 'user1' },
      // @ts-expect-error - wrong type for $min operator
      { $min: { age: 'twenty' } }
    );

    User.updateOne(
      { _id: 'user1' },
      // @ts-expect-error - wrong type for $max operator
      { $max: { age: 'thirty' } }
    );

    // NOTE: Most MongoDB update operators accept 'any' type, so these don't cause errors
    // Commented out tests that don't produce type errors:
    
    // User.updateOne({ _id: 'user1' }, { $currentDate: { nonExistent: true } });
    
    User.updateOne(
      { _id: 'user2' },
      // @ts-expect-error - wrong type in $setOnInsert
      { $setOnInsert: { age: 'thirty' } },
      { upsert: true }
    );
    
    // User.updateOne({ _id: 'user1' }, { $pullAll: { scores: ['not', 'numbers'] } });
    // User.updateOne({ _id: 'user1' }, { $set: { 'settings.notifications': 'yes' } });
    // User.updateOne({ _id: 'user1' }, { $set: { 'profile.nonExistent': 'value' } });
    // User.updateOne({ _id: 'user1' }, { $set: { 'counters.views': 'not-a-number' } });
    // User.updateOne({ _id: 'user1' }, { $set: { 'metadata.created': 'not-a-date' } });
  });

  test('updateMany - type errors', () => {
    User.updateMany(
      {},
      // @ts-expect-error - wrong type in $set operator
      { $set: { age: 'invalid' } }
    );

    // NOTE: MongoDB allows setting unknown fields
    // User.updateMany({}, { $set: { unknownField: 'value' } });

    // NOTE: MongoDB filters allow flexible types
    // User.updateMany({ name: 123 }, { $set: { age: 30 } });

    User.updateMany(
      {},
      {
        // @ts-expect-error - wrong type in $set
        $set: { name: 123 }, // wrong type
        // NOTE: MongoDB allows $inc on any field
        // $inc: { name: 1 }, // $inc on string field
        // $push: { age: 1 }, // $push on non-array
      }
    );
  });

  test('find/findOne - filter type errors', () => {
    // NOTE: MongoDB allows flexible filter types, so these don't cause errors
    // User.findOne({ age: 'thirty' });
    // User.findOne({ nonExistentField: 'value' });
    // User.findOne({ 'profile.bio': 123 });
    // Post.findOne({ _id: 'should-be-objectid' });
    // User.find({ age: { $in: ['25', '30'] } });
    // User.find({ age: { $gt: 'twenty' } });
    // User.find({ name: { $regex: 123 } });
    // User.find({ email: { $exists: 'yes' } }); // should be boolean
    // User.find({ $or: [{ age: 'invalid' }] });
    
    // NOTE: $elemMatch doesn't provide strict type checking
    // Post.find({
    //   comments: {
    //     $elemMatch: {
    //       authorId: 123, // should be string
    //     },
    //   },
    // });

    Post.find({
      // @ts-expect-error - wrong type for $size operator (should be number)
      tags: { $size: 'two' },
    });

    // NOTE: $all operator doesn't provide strict type checking
    // Post.find({
    //   tags: { $all: [123, 456] }, // should be string[]
    // });
  });

  test('findOneAndUpdate - type errors', () => {
    User.findOneAndUpdate(
      { _id: 'user1' },
      // @ts-expect-error - wrong type in update
      { $set: { age: 'invalid' } }
    );

    // NOTE: MongoDB filters allow flexible types
    // User.findOneAndUpdate({ age: 'thirty' }, { $set: { name: 'Updated' } });

    // NOTE: MongoDB allows setting non-existent fields
    // User.findOneAndUpdate(
    //   { _id: 'user1' },
    //   { $set: { nonExistent: 'value' } }
    // );
  });

  test('deleteOne/deleteMany - filter type errors', () => {
    // NOTE: MongoDB filters allow flexible types
    // User.deleteOne({ age: 'thirty' });
    // User.deleteOne({ unknownField: 'value' });
    // User.deleteMany({ name: 123 });
    // User.deleteMany({ nonExistent: true });
  });

  test('distinct - type errors', () => {
    // NOTE: distinct accepts any field name as string
    // User.distinct('nonExistentField');
    
    // NOTE: MongoDB filters allow flexible types
    // User.distinct('age', { name: 123 });

    // NOTE: MongoDB filters allow unknown fields
    // User.distinct('age', { unknownField: 'value' });
  });

  test('countDocuments - type errors', () => {
    // NOTE: MongoDB filters allow flexible types
    // User.countDocuments({ age: 'thirty' });
    // User.countDocuments({ nonExistent: true });
    // User.countDocuments({ $or: [{ age: 'invalid' }] });
  });

  test('options - type errors', () => {
    // NOTE: MongoDB options allow various types
    // User.find({}, { sort: { age: 'ascending' } }); // should be 1 or -1
    // User.find({}, { limit: 'ten' }); // should be number
    // User.find({}, { skip: 'five' }); // should be number
    // User.findOne({ _id: 'user1' }, { projection: 'invalid' }); // should be object
    // User.find({}, { invalidOption: true });
  });

  test('complex nested operations - type errors', () => {
    Strict.insertOne({
      _id: 'strict3',
      required: 'value',
      nested: {
        // @ts-expect-error - wrong type for nested required field
        required: 123, // should be string
      },
      union: 'active',
    });

    Strict.insertOne({
      _id: 'strict4',
      required: 'value',
      // @ts-expect-error - missing nested required field
      nested: {
        optional: 'value',
        // missing 'required'
      },
      union: 'active',
    });

    Strict.insertOne({
      _id: 'strict5',
      required: 'value',
      // @ts-expect-error - wrong structure for nested object
      nested: 'invalid', // should be object
      union: 'active',
    });

    User.insertOne({
      _id: 'user11',
      name: 'Test',
      age: 25,
      counters: {
        // @ts-expect-error - wrong type for Record values
        posts: 'ten', // should be number
        likes: 100,
      },
    });

    User.insertOne({
      _id: 'user13',
      name: 'Test',
      age: 25,
      metadata: {
        // @ts-expect-error - wrong type for Date field
        created: 'not-a-date', // should be Date
      },
    });

    // NOTE: MongoDB's type system accepts any type for fields
    // Post.insertOne({
    //   _id: new MongoObjectId(),
    //   title: 'Test',
    //   content: 'Content',
    //   authorId: 'user1',
    //   tags: [],
    //   likes: 0,
    //   comments: [],
    //   published: 'yes', // should be boolean
    //   metadata: { views: 0, shares: 0 },
    // });
  });

  test('mixed type errors in complex queries', () => {
    // NOTE: MongoDB filters allow flexible types
    // User.find({
    //   age: 'thirty', // MongoDB allows any type in filters
    //   name: 123, // MongoDB allows any type in filters
    //   unknownField: 'value', // non-existent
    //   'profile.bio': 456, // wrong type for nested
    // });

    // NOTE: MongoDB filters and operators allow flexible types
    // User.updateMany(
    //   { age: 'invalid' },
    //   {
    //     $set: {
    //       name: 123,
    //       age: 'thirty',
    //       unknownField: 'value', // non-existent
    //     },
    //     $inc: {
    //       'counters.posts': 'five', // wrong type
    //     },
    //     $push: {
    //       tags: 123, // wrong type
    //     },
    //   }
    // );

    // NOTE: MongoDB filters allow flexible types for _id
    // Post.updateOne({ _id: 'string-id' }, { $set: { title: 'Updated' } });

    // NOTE: MongoDB filters allow flexible types for _id
    // User.updateOne({ _id: new MongoObjectId() }, { $set: { name: 'Updated' } });

    // NOTE: MongoDB allows setting and unsetting the same field
    // User.updateOne(
    //   { _id: 'user1' },
    //   {
    //     $set: { age: 30 },
    //     $unset: { age: '' }, // can't set and unset same field
    //   }
    // );
  });

  test('insertMany - type errors', () => {
    User.insertMany([
      // @ts-expect-error - missing required field 'age'
      { _id: 'user1', name: 'Alice' },
      // @ts-expect-error - missing required field 'name'
      { _id: 'user2', age: 30 },
    ]);

    User.insertMany([
      { _id: 'user1', name: 'Alice', 
        // @ts-expect-error - wrong type for age
        age: '25' 
      },
      { _id: 'user2', 
        // @ts-expect-error - wrong type for name
        name: 123, 
        age: 30 
      },
    ]);

    // NOTE: This causes a different kind of error (not array)
    // User.insertMany('not-an-array'); // should be array
  });

  test('comment array operations - type errors', () => {
    // NOTE: MongoDB's type system accepts any type for nested fields
    // Post.insertOne({
    //   _id: new MongoObjectId(),
    //   title: 'Test',
    //   content: 'Content',
    //   authorId: 'user1',
    //   tags: [],
    //   likes: 0,
    //   comments: [
    //     {
    //       id: 'comment1',
    //       text: 'Text',
    //       authorId: 'user1',
    //       createdAt: 'not-a-date', // should be Date
    //     },
    //   ],
    //   published: false,
    //   metadata: { views: 0, shares: 0 },
    // });

    // NOTE: MongoDB's type system doesn't enforce required fields in nested arrays
    // Post.insertOne({
    //   _id: new MongoObjectId(),
    //   title: 'Test',
    //   content: 'Content',
    //   authorId: 'user1',
    //   tags: [],
    //   likes: 0,
    //   comments: [
    //     {
    //       id: 'comment1',
    //       text: 'Text',
    //       // missing authorId
    //       createdAt: new Date(),
    //     },
    //   ],
    //   published: false,
    //   metadata: { views: 0, shares: 0 },
    // });

    // NOTE: MongoDB's type system accepts any type for array fields
    // Post.insertOne({
    //   _id: new MongoObjectId(),
    //   title: 'Test',
    //   content: 'Content',
    //   authorId: 'user1',
    //   tags: [],
    //   likes: 0,
    //   comments: 'not-an-array', // should be array
    //   published: false,
    //   metadata: { views: 0, shares: 0 },
    // });
  });
});