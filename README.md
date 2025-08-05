# mongo-standard-schema

Type-safe MongoDB client library with support for multiple validation libraries.

## Features

- 🔒 **Type-safe**: Full TypeScript support with schema validation
- 🔄 **Multiple validation libraries**: Supports Zod and Valibot
- 🎯 **MongoDB-native**: Built on top of the official MongoDB driver
- 🚀 **Easy to use**: Simple API inspired by Papr
- 🔧 **Flexible**: Support for custom schema adapters
- 🔌 **Pluggable**: Choose your validation library via adapter pattern

## Installation

```bash
npm install mongo-standard-schema mongodb

# Install the validation library of your choice
npm install zod
# or
npm install valibot
```

## Quick Start

### Using Zod

```typescript
import { MongoClient } from 'mongodb';
import { Client, zodAdapterFactory } from 'mongo-standard-schema';
import { z } from 'zod';

// Connect to MongoDB
const mongoClient = await MongoClient.connect('mongodb://localhost:27017');
const dbConnection = mongoClient.db('myapp');
const client = Client.initialize(dbConnection, zodAdapterFactory);

// Define your schema
const User = client.model(
  'users',
  z.object({
    _id: z.string(), // _id is treated as string but converted to ObjectId internally
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  })
);

// Use the model
const user = await User.insertOne({
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  // _id is optional for insert operations
});

console.log(user); // { _id: "...", name: "John Doe", age: 30, email: "john@example.com" }

// Find documents
const foundUser = await User.findOne({ name: 'John Doe' });
const allUsers = await User.find({ age: { $gte: 18 } });

// Update documents
await User.updateOne(
  { _id: user._id },
  { $set: { age: 31 } }
);

// Delete documents
await User.deleteOne({ _id: user._id });
```

### Using Valibot

```typescript
import { MongoClient } from 'mongodb';
import { Client, valibotAdapterFactory } from 'mongo-standard-schema';
import * as v from 'valibot';

// Connect to MongoDB
const mongoClient = await MongoClient.connect('mongodb://localhost:27017');
const dbConnection = mongoClient.db('myapp');
const client = Client.initialize(dbConnection, valibotAdapterFactory);

// Define your schema
const User = client.model(
  'users',
  v.object({
    _id: v.string(),
    name: v.string(),
    age: v.pipe(v.number(), v.minValue(0)),
    email: v.pipe(v.string(), v.email()),
  })
);

// The rest of the API is identical!
const user = await User.insertOne({
  name: 'Jane Doe',
  age: 25,
  email: 'jane@example.com',
});
```

## API Reference

### Client

#### `Client.initialize(db: Db, adapterFactory: AdapterFactory): Client`

Initialize a new client with a MongoDB database connection and an adapter factory.

```typescript
// For Zod
const client = Client.initialize(db, zodAdapterFactory);

// For Valibot
const client = Client.initialize(db, valibotAdapterFactory);
```

#### `client.model<TSchema>(collectionName: string, schema: TSchema, options?: ModelOptions): Model`

Create a new model with a Zod schema.

**Options:**
- `parseOnFind` (boolean, default: `false`): Whether to parse documents through the schema on find operations. When `false`, find operations return raw data from MongoDB without validation. When `true`, all documents are validated against the schema.

```typescript
// Default behavior - no parsing on find
const User = client.model('users', userSchema);

// Enable parsing on find operations
const User = client.model('users', userSchema, { parseOnFind: true });
```

### Model

The Model class provides type-safe MongoDB operations:

#### Insert Operations
- `insertOne(doc: OptionalId<T>): Promise<WithId<T>>`
- `insertMany(docs: OptionalId<T>[]): Promise<WithId<T>[]>`

#### Find Operations
- `findOne(filter: PaprFilter<T>): Promise<WithId<T> | null>`
- `findById(id: string): Promise<WithId<T> | null>`
- `find(filter: PaprFilter<T>): Promise<WithId<T>[]>`
- `findCursor(filter: PaprFilter<T>): FindCursor`

#### Update Operations
- `updateOne(filter: PaprFilter<T>, update: PaprUpdateFilter<T>): Promise<UpdateResult>`
- `updateMany(filter: PaprFilter<T>, update: PaprUpdateFilter<T>): Promise<UpdateResult>`
- `findOneAndUpdate(filter: PaprFilter<T>, update: PaprUpdateFilter<T>): Promise<WithId<T> | null>`

#### Delete Operations
- `deleteOne(filter: PaprFilter<T>): Promise<DeleteResult>`
- `deleteMany(filter: PaprFilter<T>): Promise<DeleteResult>`
- `findOneAndDelete(filter: PaprFilter<T>): Promise<WithId<T> | null>`

#### Utility Operations
- `countDocuments(filter?: PaprFilter<T>): Promise<number>`
- `exists(filter: PaprFilter<T>): Promise<boolean>`
- `distinct<K>(key: K, filter?: PaprFilter<T>): Promise<T[K][]>`

## Type System

### Filters

The library provides comprehensive filter types that match MongoDB's query operators:

```typescript
// Comparison operators
await User.find({ age: { $gt: 18, $lt: 65 } });
await User.find({ name: { $in: ['John', 'Jane'] } });

// Logical operators
await User.find({
  $and: [
    { age: { $gte: 18 } },
    { email: { $exists: true } }
  ]
});

// Array operators
await User.find({ tags: { $all: ['typescript', 'mongodb'] } });
```

### Updates

Type-safe update operations with MongoDB update operators:

```typescript
// Field updates
await User.updateOne(
  { _id: userId },
  {
    $set: { name: 'New Name' },
    $inc: { age: 1 },
    $unset: { temporaryField: '' }
  }
);

// Array updates
await User.updateOne(
  { _id: userId },
  {
    $push: { tags: 'new-tag' },
    $addToSet: { categories: 'programming' }
  }
);
```

## ObjectId Handling

The library automatically handles ObjectId conversion:

- **User-facing**: All `_id` fields are treated as strings
- **Database**: Automatically converted to MongoDB ObjectId for storage
- **Queries**: String `_id` values in filters are automatically converted to ObjectId

```typescript
// You work with strings
const user = await User.insertOne({ name: 'John' });
console.log(typeof user._id); // "string"

// But MongoDB stores ObjectId
const foundUser = await User.findById(user._id); // Works seamlessly
```

## Validation

Documents are validated using your schema:

### Insert Operations
Documents are always validated during insert operations:

```typescript
const User = client.model('users', z.object({
  _id: z.string(),
  name: z.string(),
  age: z.number().min(0).max(150),
  email: z.string().email(),
}));

// This will throw a validation error
await User.insertOne({
  name: 'John',
  age: -5, // Invalid: age must be >= 0
  email: 'invalid-email', // Invalid: not a valid email
});
```

### Find Operations
By default, documents retrieved from the database are **not** parsed through the schema for performance reasons. This means:
- Find operations are faster
- You get the raw data from MongoDB
- Default values from the schema are not applied

If you need validation and default values on find operations, enable `parseOnFind`:

```typescript
// Enable parsing for find operations
const User = client.model('users', userSchema, { parseOnFind: true });

// Now find operations will:
// - Validate retrieved documents
// - Apply default values from the schema
// - Throw errors if documents don't match the schema
const user = await User.findOne({ name: 'John' });
```

This is particularly useful when:
- You have default values in your schema that should be applied
- You want to ensure data consistency when reading from the database
- You're working with data that might have been modified outside your application

## Type Inference

One of the most powerful features of mongo-standard-schema is automatic type inference. You don't need to manually define TypeScript interfaces - they are automatically derived from your validation schemas.

### How It Works

```typescript
// Define your schema once
const userSchema = z.object({
  _id: z.string(),
  name: z.string(),
  age: z.number().min(0),
  email: z.string().email(),
  isActive: z.boolean().default(true),
});

// Create a model - types are automatically inferred
const User = client.model('users', userSchema);

// TypeScript knows exactly what fields are required/optional
await User.insertOne({
  name: 'John',
  age: 30,
  email: 'john@example.com',
  // isActive is optional with default value
});

// TypeScript catches errors at compile time
// These would cause TypeScript errors:
// await User.insertOne({ name: 123 }); // Error: name must be string
// await User.insertOne({ age: '30' }); // Error: age must be number
```

### Benefits

1. **No Manual Type Definitions**: Your validation schema IS your type definition
2. **Single Source of Truth**: No risk of types and runtime validation getting out of sync
3. **Full IntelliSense Support**: Your IDE knows all available fields and their types
4. **Compile-Time Safety**: Catch errors before runtime
5. **Works with Any Validation Library**: The adapter pattern preserves type information

### Complex Types

Type inference works with complex nested structures:

```typescript
const postSchema = z.object({
  _id: z.string(),
  title: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
  }),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const Post = client.model('posts', postSchema);

// TypeScript infers the entire nested structure
const post = await Post.findOne({ 'author.name': 'John' });
if (post) {
  console.log(post.author.name); // TypeScript knows this path exists
  console.log(post.tags[0]); // TypeScript knows tags is string[]
}
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint and format
npm run lint
npm run format
```

## Requirements

- Node.js 18+
- MongoDB 5.0+
- TypeScript 5.0+

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Advanced Usage

### Custom Schema Adapters

You can create custom schema adapters for other validation libraries:

```typescript
import { SchemaAdapter, AdapterFactory } from 'mongo-standard-schema';

class MyCustomAdapter implements SchemaAdapter<Input, Output> {
  parse(data: unknown): Output {
    // Implement validation
  }
  
  safeParse(data: unknown) {
    // Implement safe validation
  }
  
  partial() {
    // Implement partial schema
  }
  
  optional() {
    // Implement optional schema
  }
  
  getSchema() {
    // Return the original schema
  }
}

const myAdapterFactory: AdapterFactory = {
  name: 'custom',
  create(schema) {
    return new MyCustomAdapter(schema);
  }
};

const client = Client.initialize(db, myAdapterFactory);
```

### Using Multiple Adapters

You can use different validation libraries for different collections:

```typescript
// Create separate clients for different adapters
const zodClient = Client.initialize(db, zodAdapterFactory);
const valibotClient = Client.initialize(db, valibotAdapterFactory);

// Use Zod for users
const User = zodClient.model('users', userZodSchema);

// Use Valibot for products
const Product = valibotClient.model('products', productValibotSchema);
```

## Roadmap

- [x] Support for Zod
- [x] Support for Valibot
- [ ] Support for ArkType
- [ ] Aggregation pipeline support
- [ ] Bulk operations
- [ ] Transactions support
- [ ] Schema migrations
- [ ] Performance optimizations
