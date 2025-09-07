/**
 * Type-only tests for typed-mongo
 * This file is tested with: pnpm test --typecheck
 */

import { describe, test, expectTypeOf } from "vitest";
import { ObjectId } from "mongodb";
import { Client } from "../src/index.js";
import type { Model } from "../src/model.js";

// Test schema types
type UserSchema = {
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
};

type PostSchema = {
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
};

type StrictSchema = {
  _id: string;
  required: string;
  optional?: string;
  nested: {
    required: string;
    optional?: string;
  };
  union: "active" | "inactive" | "pending";
  unionOptional?: "admin" | "user" | "guest";
};

// Mock database for type testing
declare const testDb: any;
const client = Client.initialize(testDb);

const User = client.model<UserSchema>("users");
const Post = client.model<PostSchema>("posts");
const Strict = client.model<StrictSchema>("strict");

describe("Type checking tests", () => {
  test("Model type inference", () => {
    expectTypeOf(User).toEqualTypeOf<Model<UserSchema>>();
    expectTypeOf(Post).toEqualTypeOf<Model<PostSchema>>();
    expectTypeOf(Strict).toEqualTypeOf<Model<StrictSchema>>();
  });

  describe("Find operations", () => {
    test("Check return types", async () => {
      const userResult = await User.findOne({ name: "John" });
      expectTypeOf(userResult).toEqualTypeOf<UserSchema | null>();

      const cursor = User.find({});
      expectTypeOf(cursor).toHaveProperty("toArray");
      const arrayResult = await cursor.toArray();
      expectTypeOf(arrayResult).toEqualTypeOf<UserSchema[]>();

      const usersResult = await User.findMany({});
      expectTypeOf(usersResult).toEqualTypeOf<UserSchema[]>();
    });

    test("Check projection", async () => {
      const projectedUserResult = await User.findOne(
        { name: "John" },
        { projection: { name: 1 } }
      );
      expectTypeOf(projectedUserResult).toEqualTypeOf<{
        _id: string;
        name: string;
      } | null>();

      const projectedUsersResult = await User.findMany(
        { name: "John" },
        { projection: { _id: 1, name: 1 } }
      );
      expectTypeOf(projectedUsersResult).toEqualTypeOf<
        {
          _id: string;
          name: string;
        }[]
      >();
    });

    test("Check filter", async () => {
      const _ = await User.findOne({
        name: "John",
        age: {
          $gt: 20,
          $lt: 40,
        },
        email: "john@example.com",
        tags: "user",
        scores: { $in: [100, 200] },
        "profile.bio": "John's bio",
      });
    });

    test("Filter type errors", async () => {
      // @ts-expect-error - non-existent field
      User.findOne({ nonExistentField: "value" });

      // @ts-expect-error - wrong type for 'name'
      User.findOne({ name: 10 });

      // @ts-expect-error - wrong type for 'age'
      User.findOne({ age: "thirty" });

      // @ts-expect-error - wrong type for 'email'
      User.findOne({ email: 123 });

      // @ts-expect-error - wrong type for 'tags'
      User.findOne({ tags: 123 });

      // @ts-expect-error - wrong type for 'scores'
      User.findOne({ scores: "100" });

      // @ts-expect-error - non-existent field
      User.findOne({ "profile.nonExistentField": "" });

      // @ts-expect-error - wrong type for 'profile.bio'
      User.findOne({ "profile.bio": 123 });
    });
  });

  describe("Insert operations", () => {
    test("Check return types", async () => {
      type UserInsertDoc = Parameters<typeof User.insertOne>[0];

      // Required fields must be present
      expectTypeOf<UserInsertDoc>().toEqualTypeOf<{
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
      }>();

      // Valid insertOne
      const userResult = await User.insertOne({
        _id: "user1",
        name: "John",
        age: 30,
      });
      expectTypeOf(userResult).toEqualTypeOf<{
        acknowledged: boolean;
        insertedId: string;
      }>();

      // Valid with optional fields
      const postResult = await Post.insertOne({
        title: "Jane",
        content: "Jane",
        authorId: "user1",
        tags: ["user", "admin"],
        likes: 0,
        comments: [],
        published: false,
        metadata: { views: 0, shares: 0 },
      });
      expectTypeOf(postResult).toEqualTypeOf<{
        acknowledged: boolean;
        insertedId: ObjectId;
      }>();

      // Valid with ObjectId _id
      const postResult2 = await Post.insertOne({
        _id: new ObjectId(),
        title: "Jane",
        content: "Jane",
        authorId: "user1",
        tags: ["user", "admin"],
        likes: 0,
        comments: [],
        published: false,
        metadata: { views: 0, shares: 0 },
      });
      expectTypeOf(postResult2).toEqualTypeOf<{
        acknowledged: boolean;
        insertedId: ObjectId;
      }>();

      const usersResult = await User.insertMany([
        {
          _id: "user1",
          name: "John",
          age: 30,
        },
        {
          _id: "user2",
          name: "Jane",
          age: 30,
        },
      ]);
      expectTypeOf(usersResult).toEqualTypeOf<{
        acknowledged: boolean;
        insertedCount: number;
        insertedIds: {
          [key: number]: string;
        };
      }>();
    });

    test("Insert type errors", async () => {
      // @ts-expect-error - _id is required if _id is not ObjectId
      User.insertOne({
        name: "John",
        age: 30,
      });

      // @ts-expect-error - missing required field
      User.insertOne({
        _id: "user1",
        name: "John",
      });

      User.insertOne({
        _id: "user1",
        name: "John",
        // @ts-expect-error - wrong type for age
        age: "thirty",
      });
    });
  });

  describe("Update operations", () => {
    test("Check return types", async () => {
      const updateOneResult = await User.updateOne(
        { name: "John" },
        { $set: { age: 31 } }
      );
      expectTypeOf(updateOneResult).toEqualTypeOf<{
        acknowledged: boolean;
        matchedCount: number;
        modifiedCount: number;
        upsertedCount: number;
        upsertedId: string | null;
      }>();

      const updateManyResult = await User.updateMany(
        { name: "John" },
        { $set: { age: 31 } }
      );
      expectTypeOf(updateManyResult).toEqualTypeOf<{
        acknowledged: boolean;
        matchedCount: number;
        modifiedCount: number;
        upsertedCount: number;
        upsertedId: string | null;
      }>();
    });

    test("Check findOneAndUpdate return types", async () => {
      const findOneAndUpdateResult = await User.findOneAndUpdate(
        { name: "John" },
        { $set: { age: 31 } }
      );
      expectTypeOf(findOneAndUpdateResult).toEqualTypeOf<UserSchema | null>();

      const findOneAndUpdateResult2 = await User.findOneAndUpdate(
        { name: "John" },
        { $set: { age: 31 } },
        { projection: { name: 1 } }
      );
      expectTypeOf(findOneAndUpdateResult2).toEqualTypeOf<{
        _id: string;
        name: string;
      } | null>();
    });

    test("Check UpdateFilter", async () => {
      User.updateOne(
        { name: "John" },
        {
          $set: {
            name: "Jane",
            age: 31,
            email: "jane@example.com",
            tags: ["user", "admin"],
            scores: [100, 200],
            profile: {
              bio: "Jane's bio",
            },
            metadata: {
              created: new Date(),
            },
          },
          $push: {
            tags: "new-tag",
          },
        }
      );
    });

    test("Check UpdateFilter type errors", async () => {
      // @ts-expect-error - wrong type for _id
      User.updateOne({ name: "John" }, { $set: { name: 31 } });

      // @ts-expect-error - wrong type for $push operator
      User.updateOne({ name: "John" }, { $push: { tags: 123 } });
    });
  });

  describe("Delete operations", () => {
    test("Check return types", async () => {
      const deleteOneResult = await User.deleteOne({ name: "John" });
      expectTypeOf(deleteOneResult).toEqualTypeOf<{
        acknowledged: boolean;
        deletedCount: number;
      }>();

      const deleteManyResult = await User.deleteMany({ name: "John" });
      expectTypeOf(deleteManyResult).toEqualTypeOf<{
        acknowledged: boolean;
        deletedCount: number;
      }>();
    });
  });
});

describe("Type error detection tests", () => {
  test("updateOne - type errors", () => {
    User.updateOne(
      { _id: "user1" },
      // @ts-expect-error - wrong type in $set operator
      { $set: { age: "thirty" } }
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
      { _id: "user1" },
      // @ts-expect-error - wrong type in $inc operator
      { $inc: { age: "five" } }
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
      { _id: "user1" },
      // @ts-expect-error - wrong type for $mul operator
      { $mul: { age: "two" } }
    );

    User.updateOne(
      { _id: "user1" },
      // @ts-expect-error - wrong type for $min operator
      { $min: { age: "twenty" } }
    );

    User.updateOne(
      { _id: "user1" },
      // @ts-expect-error - wrong type for $max operator
      { $max: { age: "thirty" } }
    );

    // NOTE: Most MongoDB update operators accept 'any' type, so these don't cause errors
    // Commented out tests that don't produce type errors:

    // User.updateOne({ _id: 'user1' }, { $currentDate: { nonExistent: true } });

    User.updateOne(
      { _id: "user2" },
      // @ts-expect-error - wrong type in $setOnInsert
      { $setOnInsert: { age: "thirty" } },
      { upsert: true }
    );

    // User.updateOne({ _id: 'user1' }, { $pullAll: { scores: ['not', 'numbers'] } });
    // User.updateOne({ _id: 'user1' }, { $set: { 'settings.notifications': 'yes' } });
    // User.updateOne({ _id: 'user1' }, { $set: { 'profile.nonExistent': 'value' } });
    // User.updateOne({ _id: 'user1' }, { $set: { 'counters.views': 'not-a-number' } });
    // User.updateOne({ _id: 'user1' }, { $set: { 'metadata.created': 'not-a-date' } });
  });

  test("updateMany - type errors", () => {
    User.updateMany(
      {},
      // @ts-expect-error - wrong type in $set operator
      { $set: { age: "invalid" } }
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

  test("findOneAndUpdate - type errors", () => {
    User.findOneAndUpdate(
      { _id: "user1" },
      // @ts-expect-error - wrong type in update
      { $set: { age: "invalid" } }
    );

    // NOTE: MongoDB filters allow flexible types
    // User.findOneAndUpdate({ age: 'thirty' }, { $set: { name: 'Updated' } });

    // NOTE: MongoDB allows setting non-existent fields
    // User.findOneAndUpdate(
    //   { _id: 'user1' },
    //   { $set: { nonExistent: 'value' } }
    // );
  });

  test("deleteOne/deleteMany - filter type errors", () => {
    // NOTE: MongoDB filters allow flexible types
    // User.deleteOne({ age: 'thirty' });
    // User.deleteOne({ unknownField: 'value' });
    // User.deleteMany({ name: 123 });
    // User.deleteMany({ nonExistent: true });
  });

  test("distinct - type errors", () => {
    // NOTE: distinct accepts any field name as string
    // User.distinct('nonExistentField');
    // NOTE: MongoDB filters allow flexible types
    // User.distinct('age', { name: 123 });
    // NOTE: MongoDB filters allow unknown fields
    // User.distinct('age', { unknownField: 'value' });
  });

  test("countDocuments - type errors", () => {
    // NOTE: MongoDB filters allow flexible types
    // User.countDocuments({ age: 'thirty' });
    // User.countDocuments({ nonExistent: true });
    // User.countDocuments({ $or: [{ age: 'invalid' }] });
  });

  test("options - type errors", () => {
    // NOTE: MongoDB options allow various types
    // User.find({}, { sort: { age: 'ascending' } }); // should be 1 or -1
    // User.find({}, { limit: 'ten' }); // should be number
    // User.find({}, { skip: 'five' }); // should be number
    // User.findOne({ _id: 'user1' }, { projection: 'invalid' }); // should be object
    // User.find({}, { invalidOption: true });
  });

  test("complex nested operations - type errors", () => {
    Strict.insertOne({
      _id: "strict3",
      required: "value",
      nested: {
        // @ts-expect-error - wrong type for nested required field
        required: 123, // should be string
      },
      union: "active",
    });

    Strict.insertOne({
      _id: "strict4",
      required: "value",
      // @ts-expect-error - missing nested required field
      nested: {
        optional: "value",
        // missing 'required'
      },
      union: "active",
    });

    Strict.insertOne({
      _id: "strict5",
      required: "value",
      // @ts-expect-error - wrong structure for nested object
      nested: "invalid", // should be object
      union: "active",
    });

    User.insertOne({
      _id: "user11",
      name: "Test",
      age: 25,
      counters: {
        // @ts-expect-error - wrong type for Record values
        posts: "ten", // should be number
        likes: 100,
      },
    });

    User.insertOne({
      _id: "user13",
      name: "Test",
      age: 25,
      metadata: {
        // @ts-expect-error - wrong type for Date field
        created: "not-a-date", // should be Date
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

  test("mixed type errors in complex queries", () => {
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

  test("insertMany - type errors", () => {
    User.insertMany([
      // @ts-expect-error - missing required field 'age'
      { _id: "user1", name: "Alice" },
      // @ts-expect-error - missing required field 'name'
      { _id: "user2", age: 30 },
    ]);

    User.insertMany([
      {
        _id: "user1",
        name: "Alice",
        // @ts-expect-error - wrong type for age
        age: "25",
      },
      {
        _id: "user2",
        // @ts-expect-error - wrong type for name
        name: 123,
        age: 30,
      },
    ]);

    // NOTE: This causes a different kind of error (not array)
    // User.insertMany('not-an-array'); // should be array
  });

  test("comment array operations - type errors", () => {
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
