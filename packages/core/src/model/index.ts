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
} from "mongodb";
import { ObjectId } from "mongodb";
import type { Adapter } from "../adapters/base.js";
import type {
  OptionalId,
  StrictOptionalId,
  PaprFilter,
  PaprProjection,
  PaprUpdateFilter,
  PaprMatchKeysAndValues,
  WithId,
  WithMongoId,
} from "../types/index.js";
import {
  convertFilterForMongo,
  convertIdForMongo,
  convertIdFromMongo,
  stringToObjectId,
} from "../utils/objectid.js";

/**
 * Options for Model configuration
 */
export interface ModelOptions {
  /**
   * Whether to parse documents on find operations
   * @default false
   */
  parseOnFind?: boolean;
}

/**
 * Model class that provides type-safe MongoDB operations
 */
export class Model<TInput, TOutput> {
  private collection: Collection;
  private options: ModelOptions;
  private idFieldType: 'string' | 'ObjectId' | 'none';

  constructor(
    private db: Db,
    private collectionName: string,
    private adapter: Adapter<TInput, TOutput>,
    options: ModelOptions = {}
  ) {
    this.collection = db.collection(collectionName);
    this.options = {
      parseOnFind: false,
      ...options,
    };
    // Get _id field type from adapter
    this.idFieldType = this.adapter.getIdFieldType?.() || 'string';
  }

  /**
   * Check if the schema expects string _id
   */
  private isStringIdSchema(): boolean {
    return this.idFieldType === 'string';
  }

  /**
   * Process update operations to apply defaults and validation
   */
  private processUpdateOperation(update: PaprUpdateFilter<TInput>): PaprUpdateFilter<TInput> {
    if (!update.$set) {
      return update;
    }

    // Check if adapter supports parseUpdateFields
    if (!this.adapter.parseUpdateFields) {
      return update;
    }

    const processedFields = this.adapter.parseUpdateFields(update.$set);
    
    // Convert _id fields in $set for MongoDB if needed
    const convertedFields = convertIdForMongo(processedFields, this.isStringIdSchema());
    
    return {
      ...update,
      $set: convertedFields as PaprMatchKeysAndValues<WithId<TInput>>,
    };
  }

  /**
   * Insert a single document
   */
  async insertOne(
    doc: StrictOptionalId<TInput>,
    options?: InsertOneOptions
  ): Promise<WithId<TOutput>> {
    // Validate the document
    const validatedDoc = this.adapter.parse(doc as TInput);
    
    // Check if _id was provided
    const docAsAny = doc as any;
    const hasProvidedId = docAsAny._id !== undefined;
    
    // Convert for MongoDB
    const mongoDoc = convertIdForMongo(validatedDoc, this.isStringIdSchema());

    const result = await this.collection.insertOne(
      mongoDoc as Document,
      options
    );

    // If _id was provided, return the validated document as is
    if (hasProvidedId) {
      return validatedDoc as WithId<TOutput>;
    }

    // If _id was not provided, add the generated _id
    const insertedDoc = {
      ...validatedDoc,
      _id: result.insertedId,
    } as WithId<TOutput>;

    // For ObjectId schemas, ensure the _id is an ObjectId instance
    if (!this.isStringIdSchema() && typeof insertedDoc._id === 'string') {
      (insertedDoc as any)._id = new ObjectId(insertedDoc._id);
    }
    
    return insertedDoc;
  }

  /**
   * Insert multiple documents
   */
  async insertMany(
    docs: StrictOptionalId<TInput>[],
    options?: BulkWriteOptions
  ): Promise<WithId<TOutput>[]> {
    // Validate documents
    const validatedDocs = docs.map((doc) => this.adapter.parse(doc as TInput));

    // Convert for MongoDB
    const mongoDocs = validatedDocs.map((doc) => convertIdForMongo(doc, this.isStringIdSchema()));

    // Insert into MongoDB
    const result = await this.collection.insertMany(
      mongoDocs as Document[],
      options
    );

    // Map inserted IDs to documents
    const docsWithIds = validatedDocs.map((doc, index) => {
      const docAsAny = doc as any;
      if (!docAsAny._id) {
        // MongoDB generated the _id
        const insertedId = result.insertedIds[index];
        const docWithId = {
          ...doc,
          _id: insertedId,
        } as WithId<TInput>;
        return convertIdFromMongo(docWithId, this.isStringIdSchema());
      }
      return doc;
    });

    return docsWithIds as WithId<TOutput>[];
  }

  /**
   * Find a single document
   */
  async findOne(
    filter: PaprFilter<TInput>,
    options?: FindOptions
  ): Promise<WithId<TOutput> | null> {
    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    const result = await this.collection.findOne(
      mongoFilter as Filter<Document>,
      options
    );

    if (!result) {
      return null;
    }

    // Convert _id based on schema type
    const docWithConvertedId = convertIdFromMongo(result, this.isStringIdSchema());
    
    // Parse only if parseOnFind is true
    if (this.options.parseOnFind) {
      return this.adapter.parse(docWithConvertedId) as WithId<TOutput>;
    }
    return docWithConvertedId as WithId<TOutput>;
  }

  /**
   * Find a document by _id
   */
  async findById(
    id: string | ObjectId,
    options?: FindOptions
  ): Promise<WithId<TOutput> | null> {
    let result: Document | null;
    
    if (this.idFieldType === 'string') {
      // For string schemas, convert ObjectId to string if needed
      const stringId = typeof id === 'string' ? id : id.toString();
      result = await this.collection.findOne(
        { _id: stringId } as Document,
        options
      );
    } else {
      // For ObjectId schemas, convert string to ObjectId if needed
      const objectId = typeof id === 'string' ? stringToObjectId(id) : id;
      result = await this.collection.findOne(
        { _id: objectId },
        options
      );
    }

    if (!result) {
      return null;
    }

    // For ObjectId schemas, ensure _id remains as ObjectId
    if (!this.isStringIdSchema() && result._id) {
      // MongoDB returns ObjectId instances, so we should preserve them
      const docWithConvertedId = convertIdFromMongo(result, this.isStringIdSchema());
      if (this.options.parseOnFind) {
        return this.adapter.parse(docWithConvertedId) as WithId<TOutput>;
      }
      return docWithConvertedId as WithId<TOutput>;
    }

    const docWithConvertedId = convertIdFromMongo(result, this.isStringIdSchema());
    if (this.options.parseOnFind) {
      return this.adapter.parse(docWithConvertedId) as WithId<TOutput>;
    }
    return docWithConvertedId as WithId<TOutput>;
  }

  /**
   * Find multiple documents
   */
  async find(
    filter: PaprFilter<TInput>,
    options?: FindOptions
  ): Promise<WithId<TOutput>[]> {
    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    const cursor = this.collection.find(
      mongoFilter as Filter<Document>,
      options
    );
    const results = await cursor.toArray();

    return results.map((doc: Record<string, unknown>) => {
      const docWithConvertedId = convertIdFromMongo(doc, this.isStringIdSchema());
      if (this.options.parseOnFind) {
        return this.adapter.parse(docWithConvertedId) as WithId<TOutput>;
      }
      return docWithConvertedId as unknown as WithId<TOutput>;
    });
  }

  /**
   * Get a cursor for finding documents
   */
  findCursor(filter: PaprFilter<TInput>, options?: FindOptions): FindCursor {
    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    return this.collection.find(mongoFilter as Filter<Document>, options);
  }

  /**
   * Update a single document
   */
  async updateOne(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    // Process update to apply defaults and validation
    const processedUpdate = this.processUpdateOperation(update);

    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    return this.collection.updateOne(
      mongoFilter as Filter<Document>,
      processedUpdate as UpdateFilter<Document>,
      options
    );
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    // Process update to apply defaults and validation
    const processedUpdate = this.processUpdateOperation(update);

    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    return this.collection.updateMany(
      mongoFilter as Filter<Document>,
      processedUpdate as UpdateFilter<Document>,
      options
    );
  }

  /**
   * Find and update a single document
   */
  async findOneAndUpdate(
    filter: PaprFilter<TInput>,
    update: PaprUpdateFilter<TInput>,
    options?: FindOneAndUpdateOptions
  ): Promise<WithId<TOutput> | null> {
    // Process update to apply defaults and validation
    const processedUpdate = this.processUpdateOperation(update);

    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    const result = await this.collection.findOneAndUpdate(
      mongoFilter as Filter<Document>,
      processedUpdate as UpdateFilter<Document>,
      {
        returnDocument: "after",
        ...options,
      }
    );

    if (!result) {
      return null;
    }

    const docWithConvertedId = convertIdFromMongo(result, this.isStringIdSchema());
    if (this.options.parseOnFind) {
      return this.adapter.parse(docWithConvertedId) as WithId<TOutput>;
    }
    return docWithConvertedId as unknown as WithId<TOutput>;
  }

  /**
   * Delete a single document
   */
  async deleteOne(
    filter: PaprFilter<TInput>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    return this.collection.deleteOne(mongoFilter as Filter<Document>, options);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    filter: PaprFilter<TInput>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    return this.collection.deleteMany(mongoFilter as Filter<Document>, options);
  }

  /**
   * Find and delete a single document
   */
  async findOneAndDelete(
    filter: PaprFilter<TInput>,
    options?: FindOneAndDeleteOptions
  ): Promise<WithId<TOutput> | null> {
    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    const result = await this.collection.findOneAndDelete(
      mongoFilter as Filter<Document>,
      options || {}
    );

    if (!result) {
      return null;
    }

    const docWithConvertedId = convertIdFromMongo(result, this.isStringIdSchema());
    if (this.options.parseOnFind) {
      return this.adapter.parse(docWithConvertedId) as WithId<TOutput>;
    }
    return docWithConvertedId as unknown as WithId<TOutput>;
  }

  /**
   * Count documents
   */
  async countDocuments(
    filter: PaprFilter<TInput> = {},
    options?: CountDocumentsOptions
  ): Promise<number> {
    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    return this.collection.countDocuments(
      mongoFilter as Filter<Document>,
      options
    );
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
    const mongoFilter = convertFilterForMongo(filter, this.isStringIdSchema());
    return this.collection.distinct(
      key as string,
      mongoFilter as Filter<Document>
    );
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
   * Get the adapter
   */
  getAdapter(): Adapter<TInput, TOutput> {
    return this.adapter;
  }
}