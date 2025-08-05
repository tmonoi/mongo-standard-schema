import { MongoClient } from 'mongodb';
import * as v from 'valibot';
import { Client, valibotAdapter } from '../src/index.js';

// Define a Valibot schema
const UserSchema = v.object({
  name: v.string(),
  age: v.pipe(v.number(), v.minValue(0), v.maxValue(150)),
  email: v.pipe(v.string(), v.email()),
  isActive: v.optional(v.boolean(), true),
  tags: v.optional(v.array(v.string()), []),
  metadata: v.optional(
    v.object({
      source: v.string(),
      referrer: v.optional(v.string()),
    })
  ),
});

async function main() {
  // Connect to MongoDB
  const mongoClient = new MongoClient('mongodb://localhost:27017');
  await mongoClient.connect();
  
  const db = mongoClient.db('myapp');
  
  // Initialize client
  const client = Client.initialize(db, mongoClient);
  
  // Create a model with Valibot adapter
  const User = client.model('users', valibotAdapter(UserSchema));
  
  // Insert a document
  const newUser = await User.insertOne({
    name: 'Alice',
    age: 30,
    email: 'alice@example.com',
    tags: ['developer', 'typescript'],
    metadata: {
      source: 'website',
    },
  });
  
  console.log('Created user:', newUser);
  
  // Find documents
  const users = await User.find({ isActive: true });
  console.log('Active users:', users);
  
  // Update a document
  await User.updateOne(
    { _id: newUser._id },
    { $set: { age: 31, tags: [...(newUser.tags || []), 'valibot'] } }
  );
  
  // Find one document
  const updatedUser = await User.findById(newUser._id);
  console.log('Updated user:', updatedUser);
  
  // Validation example - this will throw an error
  try {
    await User.insertOne({
      name: 'Bob',
      age: 200, // Invalid: exceeds maxValue(150)
      email: 'invalid-email', // Invalid: not a valid email
    });
  } catch (error) {
    console.error('Validation error:', error);
  }
  
  await mongoClient.close();
}

main().catch(console.error);