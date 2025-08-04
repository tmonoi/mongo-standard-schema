import type { Db, MongoClient } from 'mongodb';
import type { z } from 'zod';
import type { BaseSchema, InferInput as VInferInput, InferOutput as VInferOutput } from 'valibot';
import type { Adapter } from '../adapters/base.js';
import type { StandardSchemaAdapter } from '../adapters/standard-schema-adapter.js';
import type { StandardSchemaV1, InferStandardInput, InferStandardOutput } from '../types/standard-schema.js';
import { Model, type ModelOptions } from '../model/index.js';

/**
 * Type helper to infer model types based on schema
 */
type InferModelTypes<TSchema> =
  TSchema extends z.ZodType<any, any, any>
    ? { input: z.input<TSchema>; output: z.output<TSchema> }
    : TSchema extends BaseSchema<any, any, any>
    ? { input: VInferInput<TSchema>; output: VInferOutput<TSchema> }
    : TSchema extends StandardSchemaV1<infer Input, infer Output>
    ? { input: Input; output: Output }
    : { input: unknown; output: unknown };

/**
 * Main client class for mongo-standard-schema
 */
export class Client {
  private mongoClient: MongoClient | undefined;

  constructor(
    private db: Db,
    private adapter: StandardSchemaAdapter,
    mongoClient?: MongoClient
  ) {
    this.mongoClient = mongoClient;
  }

  /**
   * Initialize client with MongoDB database connection and adapter
   */
  static initialize(
    db: Db,
    adapter: StandardSchemaAdapter,
    mongoClient?: MongoClient
  ): Client {
    return new Client(db, adapter, mongoClient);
  }

  /**
   * Create a model with schema
   */
  model<TSchema>(
    collectionName: string,
    schema: TSchema,
    options?: ModelOptions,
  ): Model<
    InferModelTypes<TSchema>['input'],
    InferModelTypes<TSchema>['output']
  > {
    if (!this.adapter.supports(schema)) {
      throw new Error(`Schema is not supported by ${this.adapter.name} adapter`);
    }
    
    const adapter = this.adapter.create(schema);
    return new Model(this.db, collectionName, adapter, options) as any;
  }

  /**
   * Get the underlying MongoDB database instance
   */
  getDb(): Db {
    return this.db;
  }

  /**
   * Get the current adapter
   */
  getAdapter(): StandardSchemaAdapter {
    return this.adapter;
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
