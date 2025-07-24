import type { Db } from 'mongodb';
import type { z } from 'zod';
import type { InferOutput, SchemaAdapter } from '../adapters/base.js';
import { ZodAdapter } from '../adapters/zod.js';
import { Model } from '../model/index.js';

/**
 * Main client class for mongo-standard-schema
 */
export class Client {
  constructor(private db: Db) {}

  /**
   * Initialize client with MongoDB database connection
   */
  static initialize(db: Db): Client {
    return new Client(db);
  }

  /**
   * Create a model with Zod schema
   */
  model<TSchema extends z.ZodType>(
    collectionName: string,
    schema: TSchema,
  ): Model<z.input<TSchema>, z.output<TSchema>> {
    const adapter = new ZodAdapter(schema);
    return new Model(this.db, collectionName, adapter);
  }

  /**
   * Create a model with custom schema adapter
   */
  modelWithAdapter<TInput, TOutput = TInput>(
    collectionName: string,
    adapter: SchemaAdapter<TInput, TOutput>,
  ): Model<TInput, TOutput> {
    return new Model(this.db, collectionName, adapter);
  }

  /**
   * Get the underlying MongoDB database instance
   */
  getDb(): Db {
    return this.db;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    // Note: In practice, you should close the MongoClient, not the Db
    // This method is provided for convenience but the actual connection
    // management should be handled at the MongoClient level
    const client = (this.db as any).client;
    if (client && typeof client.close === 'function') {
      await client.close();
    }
  }
}
