import type { Db, MongoClient } from 'mongodb';
import type { Adapter } from '../adapters/base.js';
import { Model, type ModelOptions } from '../model/index.js';

/**
 * Main client class for safe-mongo
 */
export class Client {
  private mongoClient: MongoClient | undefined;

  constructor(
    private db: Db,
    mongoClient?: MongoClient
  ) {
    this.mongoClient = mongoClient;
  }

  /**
   * Initialize client with MongoDB database connection
   */
  static initialize(
    db: Db,
    mongoClient?: MongoClient
  ): Client {
    return new Client(db, mongoClient);
  }

  /**
   * Create a model with schema and adapter
   */
  model<TInput, TOutput = TInput>(
    collectionName: string,
    adapter: Adapter<TInput, TOutput>,
    options?: ModelOptions,
  ): Model<TInput, TOutput> {
    return new Model(this.db, collectionName, adapter, options);
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
    if (this.mongoClient && typeof this.mongoClient.close === 'function') {
      await this.mongoClient.close();
    }
  }
}