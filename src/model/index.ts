import type {
  AggregateOptions,
  BulkWriteOptions,
  Collection,
  CountDocumentsOptions,
  Db,
  DeleteOptions,
  DeleteResult,
  FindCursor,
  FindOneAndDeleteOptions,
  FindOneAndUpdateOptions,
  FindOptions,
  InsertOneOptions,
  InsertOneResult,
  UpdateOptions,
  UpdateResult,
  UpdateFilter,
  Document,
  Filter,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import type { SchemaAdapter } from '../adapters/base.js';
import type {
  OptionalId,
  StrictOptionalId,
  PaprFilter,
  PaprProjection,
  PaprUpdateFilter,
  WithId,
  WithMongoId,
} from '../types/index.js';
import {
  convertFilterForMongo,
  convertIdForMongo,
  convertIdFromMongo,
  stringToObjectId,
} from '../utils/objectid.js';

/**
 * Model class that provides type-safe MongoDB operations
 */
export class Model<TInput, TOutput> {
  private collection: Collection;

  constructor(
    private db: Db,
    private collectionName: string,
    private adapter: SchemaAdapter<TInput, TOutput>,
  ) {
    this.collection = db.collection(collectionName);
  }

  /**
   * Insert a single document
   */
  async insertOne(doc: StrictOptionalId<TInput>, options?: InsertOneOptions): Promise<WithId<TOutput>> {
    // If _id is provided, validate with it; otherwise, let MongoDB generate it
    if (doc._id) {
      // User provided _id, validate the full document
      const docWithId = doc as WithId<TInput>;
      const validatedDoc = this.adapter.parse(docWithId);
      const mongoDoc = convertIdForMongo(validatedDoc);

      const result = await this.collection.insertOne(mongoDoc as Document, options);

      return {
        ...validatedDoc,
        _id: result.insertedId.toString(),
      } as WithId<TOutput>;
    }

    // No _id provided, let MongoDB generate it
    const result = await this.collection.insertOne(doc as Record<string, unknown>, options);

    // Now validate with the generated _id
    const docWithGeneratedId = {
      ...doc,
      _id: result.insertedId.toString(),
    } as WithId<TInput>;

    const validatedDoc = this.adapter.parse(docWithGeneratedId);

    return validatedDoc as WithId<TOutput>;
  }

  /**
   * Insert multiple documents
   */
  async insertMany(
    docs: StrictOptionalId<TInput>[],
    options?: BulkWriteOptions,
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
    const result = await this.collection.insertMany(mongoDocs as Document[], options);

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
    options?: FindOptions,
  ): Promise<WithId<TOutput> | null> {
    const mongoFilter = convertFilterForMongo(filter);
    const result = await this.collection.findOne(
      mongoFilter as Filter<Document>,
      options,
    );

    if (!result) {
      return null;
    }

    // Convert _id back to string and validate
    const docWithStringId = convertIdFromMongo(result);
    const filteredDoc = Object.fromEntries(Object.entries(docWithStringId).filter(([, v]) => v != null));
    return this.adapter.parse(filteredDoc) as WithId<TOutput>;
  }

  /**
   * Find a document by _id
   */
  async findById(id: string, options?: FindOptions): Promise<WithId<TOutput> | null> {
    // Try both string and ObjectId formats to handle different storage scenarios
    const stringResult = await this.collection.findOne({ _id: id } as Document, options);
    if (stringResult) {
      const docWithStringId = convertIdFromMongo(stringResult);
      return this.adapter.parse(docWithStringId) as WithId<TOutput>;
    }

    // If not found as string, try as ObjectId
    const objectIdResult = await this.collection.findOne({ _id: stringToObjectId(id) }, options);
    if (objectIdResult) {
      const docWithStringId = convertIdFromMongo(objectIdResult);
      return this.adapter.parse(docWithStringId) as WithId<TOutput>;
    }

    return null;
  }

  /**
   * Find multiple documents
   */
  async find(filter: PaprFilter<TInput>, options?: FindOptions): Promise<WithId<TOutput>[]> {
    const mongoFilter = convertFilterForMongo(filter);
    const cursor = this.collection.find(mongoFilter as Filter<Document>, options);
    const results = await cursor.toArray();

    return results.map((doc: Record<string, unknown>) => {
      const docWithStringId = convertIdFromMongo(doc);
      return this.adapter.parse(docWithStringId) as WithId<TOutput>;
    });
  }

  /**
   * Get a cursor for finding documents
   */
  findCursor(filter: PaprFilter<TInput>, options?: FindOptions): FindCursor {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.find(mongoFilter as Filter<Document>, options);
  }

  /**
   * Update a single document
   */
  async updateOne(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    // Handle _id field specially to support both string and ObjectId formats
    if ('_id' in filter && typeof filter._id === 'string') {
      // Try string format first
      let result = await this.collection.updateOne({ _id: filter._id }, update as UpdateFilter<Document>, options);
      if (result.matchedCount === 0) {
        // If no match, try ObjectId format
        result = await this.collection.updateOne(
          { _id: stringToObjectId(filter._id) },
          update as UpdateFilter<Document>,
          options,
        );
      }
      return result;
    }

    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.updateOne(mongoFilter as Filter<Document>, update as UpdateFilter<Document>, options);
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.updateMany(mongoFilter as Filter<Document>, update as UpdateFilter<Document>, options);
  }

  /**
   * Find and update a single document
   */
  async findOneAndUpdate(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: FindOneAndUpdateOptions,
  ): Promise<WithId<TOutput> | null> {
    // Handle _id field specially to support both string and ObjectId formats
    if ('_id' in filter && typeof filter._id === 'string') {
      // Try string format first
      let result = await this.collection.findOneAndUpdate({ _id: filter._id }, update as UpdateFilter<Document>, {
        returnDocument: 'after',
        ...options,
      });
      if (!result) {
        // If no match, try ObjectId format
        result = await this.collection.findOneAndUpdate(
          { _id: stringToObjectId(filter._id) },
          update as UpdateFilter<Document>,
          {
            returnDocument: 'after',
            ...options,
          },
        );
      }

      if (!result) {
        return null;
      }

      const docWithStringId = convertIdFromMongo(result);
      return this.adapter.parse(docWithStringId) as WithId<TOutput>;
    }

    const mongoFilter = convertFilterForMongo(filter);
    const result = await this.collection.findOneAndUpdate(mongoFilter as Filter<Document>, update as UpdateFilter<Document>, {
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
    // Handle _id field specially to support both string and ObjectId formats
    if ('_id' in filter && typeof filter._id === 'string') {
      // Try string format first
      let result = await this.collection.deleteOne({ _id: filter._id }, options);
      if (result.deletedCount === 0) {
        // If no match, try ObjectId format
        result = await this.collection.deleteOne({ _id: stringToObjectId(filter._id) }, options);
      }
      return result;
    }

    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.deleteOne(mongoFilter as Filter<Document>, options);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(filter: PaprFilter<TInput>, options?: DeleteOptions): Promise<DeleteResult> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.deleteMany(mongoFilter as Filter<Document>, options);
  }

  /**
   * Find and delete a single document
   */
  async findOneAndDelete(
    filter: PaprFilter<TInput>,
    options?: FindOneAndDeleteOptions,
  ): Promise<WithId<TOutput> | null> {
    const mongoFilter = convertFilterForMongo(filter);
    const result = await this.collection.findOneAndDelete(mongoFilter as Filter<Document>, options || {});

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
    options?: CountDocumentsOptions,
  ): Promise<number> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.countDocuments(mongoFilter as Filter<Document>, options);
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
    filter: PaprFilter<TInput> = {},
  ): Promise<WithId<TInput>[K][]> {
    const mongoFilter = convertFilterForMongo(filter);
    return this.collection.distinct(key as string, mongoFilter as Filter<Document>);
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
