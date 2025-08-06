import { type Db, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll } from 'vitest';

let mongod: MongoMemoryServer;
let mongoClient: MongoClient;
let db: Db;

export const startTestDb = async (): Promise<{ client: MongoClient; db: Db; uri: string }> => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('test');
  return { client: mongoClient, db, uri };
};

export const stopTestDb = async (): Promise<void> => {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongod) {
    await mongod.stop();
  }
};

// Global setup for all tests
beforeAll(async () => {
  const testDb = await startTestDb();
  // Make db available globally for tests
  (globalThis as any).testDb = testDb.db;
  (globalThis as any).testClient = testDb.client;
});

afterAll(async () => {
  await stopTestDb();
});