import type {
  Db,
  Collection,
  InsertOneResult,
  UpdateResult,
  DeleteResult,
  FindOptions,
  InsertOneOptions,
  UpdateOptions,
  DeleteOptions,
  FindOneAndUpdateOptions,
  FindOneAndDeleteOptions,
  CountDocumentsOptions,
  BulkWriteOptions,
  AggregateOptions,
  FindCursor,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import type { SchemaAdapter } from '../adapters/base.js';
import type { PaprFilter, PaprUpdateFilter, PaprProjection, WithId, OptionalId } from '../types/index.js';
import {
  convertIdForMongo,
  convertIdFromMongo,
  convertFilterForMongo,
  stringToObjectId,
} from '../utils/objectid.js';

/**
 * Model class that provides type-safe MongoDB operations
 */
export class Model<TInput, TOutput = TInput> {
  private collection: Collection;

  constructor(
    private db: Db,
    private collectionName: string,
    private adapter: SchemaAdapter<TInput, TOutput>
  ) {
    this.collection = db.collection(collectionName);
  }

  /**
   * Insert a single document
   */
  async insertOne(
    doc: OptionalId<TInput>,
    options?: InsertOneOptions
  ): Promise<WithId<TOutput>> {
    // If _id is provided, validate with it; otherwise, let MongoDB generate it
    if (doc._id) {
      // User provided _id, validate the full document
      const docWithId = doc as WithId<TInput>;
      const validatedDoc = this.adapter.parse(docWithId);
      const mongoDoc = convertIdForMongo(validatedDoc);
      
      const result = await this.collection.insertOne(mongoDoc, options);
      
      return {
        ...validatedDoc,
        _id: result.insertedId.toString(),
      } as WithId<TOutput>;
    }
    
    // No _id provided, let MongoDB generate it
    console.log('insertOne doc before insert:', doc);
    const result = await this.collection.insertOne(doc as any, options);
    console.log('insertOne result.insertedId:', result.insertedId);
    console.log('insertOne result.insertedId.toString():', result.insertedId.toString());
    
    // Now validate with the generated _id
    const docWithGeneratedId = {
      ...doc,
      _id: result.insertedId.toString(),
    } as WithId<TInput>;
    
    const validatedDoc = this.adapter.parse(docWithGeneratedId);
    console.log('insertOne validatedDoc:', validatedDoc);
    
    return validatedDoc as WithId<TOutput>;
  }

  /**
   * Insert multiple documents
   */
  async insertMany(
    docs: OptionalId<TInput>[],
    options?: BulkWriteOptions
  ): Promise<WithId<TOutput>[]> {
    // Generate _ids and validate documents
    const docsWithIds = docs.map((doc) => ({
      ...doc,
      _id: doc._id || new ObjectId().toString(),
    })) as WithId<TInput>[];

    const validatedDocs = docsWithIds.map((doc) => this.adapter.parse(doc));

    // Convert for MongoDB
    const mongoDocs = validatedDocs.map((doc) => convertIdForMongo(doc));

    // Insert into MongoDB
    const result = await this.collection.insertMany(mongoDocs, options);

    // Return the inserted documents with string _ids
    return validatedDocs.map((doc, index) => ({
      ...doc,
      _id: Object.values(result.insertedIds)[index]?.toString() || (doc as WithId<TOutput>)._id,
    })) as WithId<TOutput>[];
  }

  /**
   * Find a single document
   */
  async findOne(
    filter: PaprFilter<TInput>,
    options?: FindOptions
  ): Promise<WithId<TOutput> | null> {
    const mongoFilter = convertFilterForMongo(filter);
    const result = await this.collection.findOne(mongoFilter, options);

    if (!result) {
      return null;
    }

    // Convert _id back to string and validate
    const docWithStringId = convertIdFromMongo(result);
    return this.adapter.parse(docWithStringId) as WithId<TOutput>;
  }

  /**
   * Find a document by _id
   */
  async findById(id: string, options?: FindOptions): Promise<WithId<TOutput> | null> {
    console.log('findById called with id:', id);
    const filter = { _id: id } as PaprFilter<TInput>;
    console.log('findById filter:', filter);
    const mongoFilter = convertFilterForMongo(filter);
    console.log('findById mongoFilter:', mongoFilter);
    return this.findOne(filter, options);
  }

  /**
   * Find multiple documents
   */
  async find(filter: PaprFilter<TInput>, options?: FindOptions): Promise<WithId<TOutput>[]> {
    const mongoFilter = convertFilterForMongo(filter);
    const cursor = this.collection.find(mongoFilter, options);
    const results = await cursor.toArray();

    return results.map((doc: any) => {
      const docWithStringId = convertIdFromMongo(doc);
      return this.adapter.parse(docWithStringId) as WithId<TOutput>;
    });
  }

  /**
   * Get a cursor for finding documents
   */
  findCursor(filter: PaprFilter<TInput>, options?: FindOptions): FindCursor {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.find(mongoFilter, options);
  }

  /**
   * Update a single document
   */
  async updateOne(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.updateOne(mongoFilter, update as any, options);
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.updateMany(mongoFilter, update as any, options);
  }

  /**
   * Find and update a single document
   */
  async findOneAndUpdate(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: FindOneAndUpdateOptions
  ): Promise<WithId<TOutput> | null> {
    const mongoFilter = convertFilterForMongo(filter);
    const result = await this.collection.findOneAndUpdate(mongoFilter, update as any, {
      returnDocument: 'after',
      ...options,
    });

    if (!result) {
      return null;
    }

    const docWithStringId = convertIdFromMongo(result);
    return this.adapter.parse(docWithStringId) as WithId<TOutput>;
  }

  /**
   * Delete a single document
   */
  async deleteOne(filter: PaprFilter<TInput>, options?: DeleteOptions): Promise<DeleteResult> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.deleteOne(mongoFilter, options);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(filter: PaprFilter<TInput>, options?: DeleteOptions): Promise<DeleteResult> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.deleteMany(mongoFilter, options);
  }

  /**
   * Find and delete a single document
   */
  async findOneAndDelete(
    filter: PaprFilter<TInput>,
    options?: FindOneAndDeleteOptions
  ): Promise<WithId<TOutput> | null> {
    const mongoFilter = convertFilterForMongo(filter);
    const result = await this.collection.findOneAndDelete(mongoFilter, options || {});

    if (!result) {
      return null;
    }

    const docWithStringId = convertIdFromMongo(result);
    return this.adapter.parse(docWithStringId) as WithId<TOutput>;
  }

  /**
   * Count documents
   */
  async countDocuments(
    filter: PaprFilter<TInput> = {},
    options?: CountDocumentsOptions
  ): Promise<number> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.countDocuments(mongoFilter, options);
  }

  /**
   * Check if documents exist
   */
  async exists(filter: PaprFilter<TInput>): Promise<boolean> {
    const count = await this.countDocuments(filter);
    return count > 0;
  }

  /**
   * Get distinct values
   */
  async distinct<K extends keyof WithId<TInput>>(
    key: K,
    filter: PaprFilter<TInput> = {}
  ): Promise<WithId<TInput>[K][]> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.distinct(key as string, mongoFilter);
  }

  /**
   * Get the underlying MongoDB collection
   */
  getCollection(): Collection {
    return this.collection;
  }

  /**
   * Get the collection name
   */
  getCollectionName(): string {
    return this.collectionName;
  }

  /**
   * Get the schema adapter
   */
  getAdapter(): SchemaAdapter<TInput, TOutput> {
    return this.adapter;
  }
}
