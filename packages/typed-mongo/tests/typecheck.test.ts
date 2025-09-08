import {
  describe,
  test,
  expectTypeOf,
  beforeEach,
  beforeAll,
  afterAll,
  expect,
} from "vitest";
import { type BulkWriteResult, ObjectId } from "mongodb";
import { Client } from "../src/index.js";
import type { Model } from "../src/model.js";
import { testDbManager } from "./setup/mongodb-memory-server.js";
import { z } from "zod";

const userSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    age: z.number(),
    email: z.string().optional(),
    tags: z.array(z.string()).optional(),
    scores: z.array(z.number()).optional(),
    profile: z
      .object({
        bio: z.string(),
        avatar: z.string().optional(),
      })
      .optional(),
    settings: z
      .object({
        theme: z.string(),
        notifications: z.boolean(),
      })
      .optional(),
    metadata: z
      .object({
        created: z.date(),
        updated: z.date().optional(),
      })
      .optional(),
    counters: z.record(z.string(), z.number()).optional(),
  })
  .strict();

const postSchema = z
  .object({
    _id: z.instanceof(ObjectId),
    title: z.string(),
    content: z.string(),
    authorId: z.string(),
    tags: z.array(z.string()),
    likes: z.number(),
    comments: z.array(
      z.object({
        id: z.string(),
        text: z.string(),
        authorId: z.string(),
        createdAt: z.date(),
      })
    ),
    published: z.boolean(),
    publishedAt: z.date().optional(),
    metadata: z.object({
      views: z.number(),
      shares: z.number(),
    }),
  })
  .strict();

type UserSchema = z.infer<typeof userSchema>;
type PostSchema = z.infer<typeof postSchema>;

describe("Type checking tests", () => {
  let client: Client;
  let User: Model<UserSchema>;
  let Post: Model<PostSchema>;

  beforeAll(async () => {
    const testDb = testDbManager.getDb();
    client = Client.initialize(testDb);
    User = client.model<UserSchema>("users");
    Post = client.model<PostSchema>("posts");
  });

  describe("Find operations", () => {
    beforeAll(async () => {
      await User.deleteMany({});
      await Post.deleteMany({});

      await User.insertMany([
        {
          _id: "user1",
          name: "John",
          age: 30,
          profile: { bio: "John's bio" },
          settings: { theme: "light", notifications: true },
          metadata: { created: new Date() },
        },
        { _id: "user2", name: "Jane", age: 25 },
      ]);
      await Post.insertMany([
        {
          title: "Post 1",
          content: "Post 1",
          authorId: "user1",
          tags: ["tag1"],
          metadata: { views: 100, shares: 10 },
          likes: 10,
          comments: [
            {
              id: "comment1",
              text: "Comment 1",
              authorId: "user1",
              createdAt: new Date(),
            },
          ],
          published: true,
          publishedAt: new Date(),
        },
        {
          title: "Post 2",
          content: "Post 2",
          authorId: "user2",
          tags: ["tag2"],
          metadata: { views: 200, shares: 20 },
          likes: 20,
          comments: [
            {
              id: "comment2",
              text: "Comment 2",
              authorId: "user2",
              createdAt: new Date(),
            },
          ],
          published: true,
          publishedAt: new Date(),
        },
      ]);
    });

    test("the findOne data type should match the schema-inferred type", async () => {
      const user = await User.findOne({ name: "John" });
      expect(user).not.toBeNull();
      if (!user) return;
      expect(userSchema.safeParse(user).success).toBe(true);
      expectTypeOf(user).toEqualTypeOf<z.infer<typeof userSchema>>();

      const post = await Post.findOne({ title: "Post 1" });
      expect(post).not.toBeNull();
      if (!post) return;
      expect(postSchema.safeParse(post).success).toBe(true);
      expectTypeOf(post).toEqualTypeOf<z.infer<typeof postSchema>>();
    });

    test("the findOne projection data type should match the schema-inferred type", async () => {
      // _id is always included in the projection
      const projectedUserSchema = userSchema.pick({
        _id: true,
        name: true,
      });
      const projectedUserResult = await User.findOne(
        { name: "John" },
        { projection: { name: 1 } }
      );
      expect(projectedUserResult).not.toBeNull();
      if (!projectedUserResult) return;
      expect(projectedUserSchema.safeParse(projectedUserResult).success).toBe(
        true
      );
      expectTypeOf(projectedUserResult).toEqualTypeOf<
        z.infer<typeof projectedUserSchema>
      >();
    });
  });
});
