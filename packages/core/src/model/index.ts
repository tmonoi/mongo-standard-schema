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
  OptionalUnlessRequiredId,
  ObjectId,
  OptionalId,
  InsertManyResult,
} from "mongodb";
import type { Adapter } from "../adapters/base.js";
import type {
  StrictOptionalId,
  PaprFilter,
  PaprProjection,
  PaprUpdateFilter,
  PaprMatchKeysAndValues,
  WithId,
  WithMongoId,
  DocumentForInsert,
} from "../types/index.js";
import { ValidationError } from "../utils/error.js";
import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Model class that provides type-safe MongoDB operations
 */
export class Model<TInput, TOutput> {
  private collection: Collection;
  private idFieldType: "string" | "ObjectId" | "none";

  constructor(
    private db: Db,
    private collectionName: string,
    private adapter: Adapter<TInput, TOutput>,
  ) {
    this.collection = db.collection(collectionName);
    // Get _id field type from adapter
    this.idFieldType = this.adapter.getIdFieldType?.() || "string";
  }

  /**
   * Process update operations to apply defaults and validation
   */
  private processUpdateOperation(
    update: PaprUpdateFilter<TInput>
  ): PaprUpdateFilter<TInput> {
    // Check if adapter supports parseUpdateFields
    if (!this.adapter.parseUpdateFields) {
      return update;
    }

    const processedUpdate = { ...update };

    // Process $set operation
    if (update.$set) {
      const processedFields = this.adapter.parseUpdateFields(update.$set);
      processedUpdate.$set = processedFields as PaprMatchKeysAndValues<TInput>;
    }

    // Process $setOnInsert operation
    if (update.$setOnInsert) {
      const processedFields = this.adapter.parseUpdateFields(update.$setOnInsert);
      processedUpdate.$setOnInsert = processedFields as PaprMatchKeysAndValues<TInput>;
    }

    // Process $push operation
    if (update.$push) {
      const processedFields = this.adapter.parseUpdateFields(update.$push);
      processedUpdate.$push = processedFields as typeof update.$push;
    }

    // Process $addToSet operation
    if (update.$addToSet) {
      const processedFields = this.adapter.parseUpdateFields(update.$addToSet);
      processedUpdate.$addToSet = processedFields as typeof update.$addToSet;
    }

    // Process $min operation
    if (update.$min) {
      const processedFields = this.adapter.parseUpdateFields(update.$min);
      processedUpdate.$min = processedFields as PaprMatchKeysAndValues<TInput>;
    }

    // Process $max operation
    if (update.$max) {
      const processedFields = this.adapter.parseUpdateFields(update.$max);
      processedUpdate.$max = processedFields as PaprMatchKeysAndValues<TInput>;
    }

    return processedUpdate;
  }

  /**
   * Insert a single document
   */
  async insertOne(
    doc: StrictOptionalId<TInput>,
    options?: InsertOneOptions
  ): Promise<WithId<TOutput>> {
    // Validate the document
    const validatedResult = this.adapter.validateForInsert(doc);
    if (validatedResult.issues) {
      throw new ValidationError("Validation failed", validatedResult.issues);
    }
    const validatedDoc = validatedResult.value;

    const result = await this.collection.insertOne(
      validatedDoc as unknown as OptionalId<TOutput>,
      options
    );

    // If _id was not provided, add the generated _id
    const insertedDoc = {
      ...validatedDoc,
      _id: result.insertedId,
    } as unknown as WithId<TOutput>;

    if (result.acknowledged) {
      return insertedDoc;
    }

    throw new Error("insertOne failed");
  }

  /**
   * Insert multiple documents
   */
  async insertMany(
    docs: StrictOptionalId<TInput>[],
    options?: BulkWriteOptions
  ): Promise<InsertManyResult> {
    // Validate documents
    const validatedDocs: StrictOptionalId<TOutput>[] = [];
    for (const doc of docs) {
      const validatedResult = this.adapter.validateForInsert(doc);
      if (validatedResult.issues) {
        throw new ValidationError("Validation failed", validatedResult.issues);
      }
      validatedDocs.push(validatedResult.value);
    }

    // Insert into MongoDB
    return this.collection.insertMany(
      validatedDocs as unknown as OptionalId<Document>[],
      options
    ) as unknown as InsertManyResult;
  }

  /**
   * Find a single document
   */
  async findOne(
    filter: PaprFilter<TInput>,
    options?: FindOptions
  ): Promise<WithId<TOutput> | null> {
    return this.collection.findOne(
      filter as Filter<Document>,
      options
    );
  }

  /**
   * Find multiple documents
   */
  async find(
    filter: PaprFilter<TInput>,
    options?: FindOptions
  ): Promise<WithId<TOutput>[]> {
    const cursor = this.collection.find(
      filter as Filter<Document>,
      options
    );
    const results = await cursor.toArray();
    return results as WithId<TOutput>[];
  }

  /**
   * Get a cursor for finding documents
   */
  findCursor(filter: PaprFilter<TInput>, options?: FindOptions): FindCursor {
    return this.collection.find(filter as Filter<Document>, options);
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

    return this.collection.updateOne(
      filter as Filter<Document>,
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

    return this.collection.updateMany(
      filter as Filter<Document>,
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

    const result = await this.collection.findOneAndUpdate(
      filter as Filter<Document>,
      processedUpdate as UpdateFilter<Document>,
      {
        returnDocument: "after",
        ...options,
      }
    );

    return result as unknown as WithId<TOutput>;
  }

  /**
   * Delete a single document
   */
  async deleteOne(
    filter: PaprFilter<TInput>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return this.collection.deleteOne(filter as Filter<Document>, options);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    filter: PaprFilter<TInput>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return this.collection.deleteMany(filter as Filter<Document>, options);
  }

  /**
   * Find and delete a single document
   */
  async findOneAndDelete(
    filter: PaprFilter<TInput>,
    options?: FindOneAndDeleteOptions
  ): Promise<WithId<TOutput> | null> {
    const result = await this.collection.findOneAndDelete(
      filter as Filter<Document>,
      options || {}
    );  

    return result as unknown as WithId<TOutput>;
  }

  /**
   * Count documents
   */
  async countDocuments(
    filter: PaprFilter<TInput> = {},
    options?: CountDocumentsOptions
  ): Promise<number> {
    return this.collection.countDocuments(
      filter as Filter<Document>,
      options
    );
  }

  /**
   * Get distinct values
   */
  async distinct<K extends keyof WithId<TInput>>(
    key: K,
    filter: PaprFilter<TInput> = {}
  ): Promise<WithId<TInput>[K][]> {
    return this.collection.distinct(
      key as string,
      filter as Filter<Document>
    );
  }
}
