# mongo-standard-schema

Type-safe MongoDB client library with support for multiple validation libraries.

## Features

- 🔒 **Type-safe**: Full TypeScript support with schema validation
- 🔄 **Multiple validation libraries**: Currently supports Zod (more coming soon)
- 🎯 **MongoDB-native**: Built on top of the official MongoDB driver
- 🚀 **Easy to use**: Simple API inspired by Papr
- 🔧 **Flexible**: Support for custom schema adapters

## Installation

```bash
npm install mongo-standard-schema mongodb zod
```

## Quick Start

```typescript
import { MongoClient } from 'mongodb';
import { Client } from 'mongo-standard-schema';
import { z } from 'zod';

// Connect to MongoDB
const mongoClient = await MongoClient.connect('mongodb://localhost:27017');
const dbConnection = mongoClient.db('myapp');
const client = Client.initialize(dbConnection);

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

## API Reference

### Client

#### `Client.initialize(db: Db): Client`

Initialize a new client with a MongoDB database connection.

#### `client.model<TSchema>(collectionName: string, schema: TSchema): Model`

Create a new model with a Zod schema.

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

Documents are validated using your schema before database operations:

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

## Roadmap

- [ ] Support for Valibot
- [ ] Support for ArkType
- [ ] Aggregation pipeline support
- [ ] Bulk operations
- [ ] Transactions support
- [ ] Schema migrations
- [ ] Performance optimizations
