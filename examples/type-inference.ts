import { Client, zodAdapter } from '@safe-mongo/zod';
import { Client as ValibotClient, valibotAdapter } from '@safe-mongo/valibot';
import { z } from 'zod';
import * as v from 'valibot';
import type { Db } from 'mongodb';

// Example database connection (placeholder)
declare const db: Db;

// ============================================
// Zod Example with Type Inference
// ============================================

// Initialize client with Zod adapter
const zodClient = Client.initialize(db);

// Define a Zod schema
const userZodSchema = z.object({
  _id: z.string(),
  name: z.string(),
  age: z.number().min(0),
  email: z.string().email(),
  isActive: z.boolean().default(true),
});

// Create a model - types are automatically inferred
const UserZod = zodClient.model('users', zodAdapter(userZodSchema));

// TypeScript knows the exact shape of the documents
async function zodExample() {
  // ✅ Valid insert - TypeScript knows which fields are required/optional
  const user = await UserZod.insertOne({
    name: 'John Doe',
    age: 30,
    email: 'john@example.com',
    // isActive is optional with default value
  });

  // TypeScript knows the types of all fields
  console.log(user.name); // string
  console.log(user.age); // number
  console.log(user.isActive); // boolean

  // ❌ These would cause TypeScript errors:
  // await UserZod.insertOne({ name: 'Jane' }); // Error: missing required fields
  // await UserZod.insertOne({ name: 123, age: 30, email: 'jane@example.com' }); // Error: wrong type

  // ✅ Type-safe queries
  const found = await UserZod.findOne({ age: { $gte: 18 } });
  if (found) {
    console.log(found.email); // TypeScript knows this is a string
  }

  // ❌ This would cause a TypeScript error:
  // await UserZod.findOne({ age: '30' }); // Error: age must be number
}

// ============================================
// Valibot Example with Type Inference
// ============================================

// Initialize client with Valibot adapter
const valibotClient = ValibotClient.initialize(db);

// Define a Valibot schema
const userValibotSchema = v.object({
  _id: v.string(),
  name: v.string(),
  age: v.pipe(v.number(), v.minValue(0)),
  email: v.pipe(v.string(), v.email()),
  role: v.union([v.literal('admin'), v.literal('user'), v.literal('guest')]),
});

// Create a model - types are automatically inferred
const UserValibot = valibotClient.model('users', valibotAdapter(userValibotSchema));

// TypeScript knows the exact shape of the documents
async function valibotExample() {
  // ✅ Valid insert
  const user = await UserValibot.insertOne({
    name: 'Jane Doe',
    age: 25,
    email: 'jane@example.com',
    role: 'admin', // TypeScript knows this must be 'admin' | 'user' | 'guest'
  });

  // Type inference works perfectly
  console.log(user.role); // TypeScript knows: 'admin' | 'user' | 'guest'

  // ❌ These would cause TypeScript errors:
  // await UserValibot.insertOne({
  //   name: 'Bob',
  //   age: -5, // Error: must be >= 0
  //   email: 'not-an-email', // Error: invalid email
  //   role: 'superuser' // Error: not a valid role
  // });

  // ✅ Type-safe updates
  await UserValibot.updateOne(
    { _id: user._id },
    { $set: { role: 'user' } } // TypeScript ensures valid role
  );
}

// ============================================
// Advanced Type Inference Examples
// ============================================

// Complex nested schema with Zod
const postSchema = z.object({
  _id: z.string(),
  title: z.string(),
  content: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
  }),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
  publishedAt: z.date().optional(),
});

const Post = zodClient.model('posts', zodAdapter(postSchema));

async function advancedExample() {
  // TypeScript infers the entire nested structure
  const post = await Post.insertOne({
    title: 'Type Safety in MongoDB',
    content: 'Learn how to use type-safe MongoDB operations...',
    author: {
      id: '123',
      name: 'John Doe',
    },
    tags: ['mongodb', 'typescript', 'type-safety'],
    metadata: {
      views: 0,
      likes: 0,
    },
  });

  // Deep type inference
  console.log(post.author.name); // TypeScript knows this path exists
  console.log(post.tags[0]); // TypeScript knows tags is string[]
  
  // Optional fields are properly typed
  if (post.publishedAt) {
    console.log(post.publishedAt.toISOString()); // TypeScript knows it's a Date
  }
}

// ============================================
// Benefits of Type Inference
// ============================================

/*
1. **No Manual Type Definitions**: You don't need to define TypeScript interfaces
   separately from your schemas. The types are automatically derived.

2. **Single Source of Truth**: Your validation schema IS your type definition.
   No risk of types and runtime validation getting out of sync.

3. **Full IntelliSense Support**: Your IDE knows exactly what fields are available,
   their types, and whether they're required or optional.

4. **Compile-Time Safety**: Catch errors before runtime. Invalid operations
   are caught by TypeScript during development.

5. **Works with Any Validation Library**: The adapter pattern means you can use
   Zod, Valibot, or any other validation library while maintaining full type safety.
*/