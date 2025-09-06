import type { Db, MongoClient } from 'mongodb';
import { Model } from './model.js';
import type { BaseSchema } from './types.js';

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
  model<TSchema extends BaseSchema>(
    collectionName: string,
  ): Model<TSchema> {
    return new Model(this.db, collectionName);
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