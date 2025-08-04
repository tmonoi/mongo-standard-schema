import type { Db, MongoClient } from 'mongodb';
import type { SchemaAdapter } from '../adapters/base.js';
import type { AdapterFactory } from '../adapters/factory.js';
import { Model, type ModelOptions } from '../model/index.js';

/**
 * Main client class for mongo-standard-schema
 */
export class Client<TAdapterFactory extends AdapterFactory = AdapterFactory> {
  private mongoClient: MongoClient | undefined;

  constructor(
    private db: Db,
    private adapterFactory: TAdapterFactory,
    mongoClient?: MongoClient
  ) {
    this.mongoClient = mongoClient;
  }

  /**
   * Initialize client with MongoDB database connection and adapter factory
   */
  static initialize<TAdapterFactory extends AdapterFactory>(
    db: Db,
    adapterFactory: TAdapterFactory,
    mongoClient?: MongoClient
  ): Client<TAdapterFactory> {
    return new Client(db, adapterFactory, mongoClient);
  }

  /**
   * Create a model with schema
   */
  model<TSchema>(
    collectionName: string,
    schema: TSchema,
    options?: ModelOptions,
  ): Model<any, any> {
    const adapter = this.adapterFactory.create(schema);
    return new Model(this.db, collectionName, adapter, options);
  }

  /**
   * Get the underlying MongoDB database instance
   */
  getDb(): Db {
    return this.db;
  }

  /**
   * Get the current adapter factory
   */
  getAdapterFactory(): TAdapterFactory {
    return this.adapterFactory;
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
