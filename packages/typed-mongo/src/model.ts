import type {
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
  UpdateOptions,
  UpdateResult,
  UpdateFilter,
  Document,
  Filter,
  InsertManyResult,
  InsertOneResult,
  OptionalUnlessRequiredId,
  DistinctOptions,
  EstimatedDocumentCountOptions,
  BulkWriteResult,
  AnyBulkWriteOperation,
  AggregateOptions,
  AggregationCursor,
  ReplaceOptions,
  FindOneAndReplaceOptions,
} from "mongodb";
import type {
  StrictOptionalId,
  PaprFilter,
  PaprUpdateFilter,
  Projection,
  ProjectionType,
  BaseSchema,
  PaprBulkWriteOperation,
} from "./types.js";

/**
 * Model class that provides type-safe MongoDB operations
 */
export class Model<TSchema extends BaseSchema> {
  private collection: Collection<TSchema>;

  constructor(db: Db, collectionName: string) {
    this.collection = db.collection<TSchema>(collectionName);
  }

  /**
   * Find a single document
   */
  async findOne<TProjection extends Projection<TSchema> | undefined>(
    filter: PaprFilter<TSchema>,
    options?: FindOptions<TSchema> & { projection?: TProjection }
  ): Promise<ProjectionType<TSchema, TProjection> | null> {
    const result = await this.collection.findOne(
      filter as Filter<TSchema>,
      options
    );
    return result as unknown as ProjectionType<TSchema, TProjection>;
  }

  /**
   * Find documents and return a cursor (MongoDB standard behavior)
   */
  find<TProjection extends Projection<TSchema> | undefined>(
    filter: PaprFilter<TSchema>,
    options?: FindOptions<TSchema> & { projection?: TProjection }
  ): FindCursor<ProjectionType<TSchema, TProjection>> {
    return this.collection.find(
      filter as Filter<TSchema>,
      options
    ) as unknown as FindCursor<ProjectionType<TSchema, TProjection>>;
  }

  /**
   * Find multiple documents and return as array (convenience method)
   */
  async findMany<TProjection extends Projection<TSchema> | undefined>(
    filter: PaprFilter<TSchema>,
    options?: FindOptions<TSchema> & { projection?: TProjection }
  ): Promise<ProjectionType<TSchema, TProjection>[]> {
    const cursor = this.collection.find(filter as Filter<TSchema>, options);
    const results = await cursor.toArray();
    return results as unknown as ProjectionType<TSchema, TProjection>[];
  }

  /**
   * Insert a single document
   */
  async insertOne(
    doc: StrictOptionalId<TSchema>,
    options?: InsertOneOptions
  ): Promise<InsertOneResult<TSchema>> {
    const result = await this.collection.insertOne(
      doc as unknown as OptionalUnlessRequiredId<TSchema>,
      options
    );
    return result;
  }

  /**
   * Insert multiple documents
   */
  async insertMany(
    docs: StrictOptionalId<TSchema>[],
    options?: BulkWriteOptions
  ): Promise<InsertManyResult<TSchema>> {
    return this.collection.insertMany(
      docs as unknown as OptionalUnlessRequiredId<TSchema>[],
      options
    );
  }

  /**
   * Update a single document
   */
  async updateOne(
    filter: PaprFilter<TSchema>,
    update: PaprUpdateFilter<TSchema>,
    options?: UpdateOptions
  ): Promise<UpdateResult<TSchema>> {
    return this.collection.updateOne(
      filter as Filter<TSchema>,
      update as UpdateFilter<TSchema>,
      options
    );
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: PaprFilter<TSchema>,
    update: PaprUpdateFilter<TSchema>,
    options?: UpdateOptions
  ): Promise<UpdateResult<TSchema>> {
    return this.collection.updateMany(
      filter as Filter<TSchema>,
      update as UpdateFilter<TSchema>,
      options
    );
  }

  /**
   * Replace a single document
   */
  async replaceOne(
    filter: PaprFilter<TSchema>,
    replacement: StrictOptionalId<TSchema>,
    options?: ReplaceOptions
  ): Promise<UpdateResult<TSchema>> {
    return this.collection.replaceOne(
      filter as Filter<TSchema>,
      replacement as TSchema,
      options
    );
  }

  /**
   * Find and update a single document
   */
  async findOneAndUpdate<TProjection extends Projection<TSchema> | undefined>(
    filter: PaprFilter<TSchema>,
    update: PaprUpdateFilter<TSchema>,
    options?: FindOneAndUpdateOptions & { projection?: TProjection }
  ): Promise<ProjectionType<TSchema, TProjection> | null> {
    const result = await this.collection.findOneAndUpdate(
      filter as Filter<TSchema>,
      update as UpdateFilter<TSchema>,
      options || {}
    );
    return result as unknown as ProjectionType<TSchema, TProjection>;
  }

  /**
   * Find and replace a single document
   */
  async findOneAndReplace<TProjection extends Projection<TSchema> | undefined>(
    filter: PaprFilter<TSchema>,
    replacement: StrictOptionalId<TSchema>,
    options?: FindOneAndReplaceOptions & { projection?: TProjection }
  ): Promise<ProjectionType<TSchema, TProjection> | null> {
    const result = await this.collection.findOneAndReplace(
      filter as Filter<TSchema>,
      replacement as TSchema,
      options || {}
    );
    return result as unknown as ProjectionType<TSchema, TProjection>;
  }

  /**
   * Delete a single document
   */
  async deleteOne(
    filter: PaprFilter<TSchema>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return this.collection.deleteOne(filter as Filter<TSchema>, options);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    filter: PaprFilter<TSchema>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return this.collection.deleteMany(filter as Filter<TSchema>, options);
  }

  /**
   * Find and delete a single document
   */
  async findOneAndDelete<TProjection extends Projection<TSchema> | undefined>(
    filter: PaprFilter<TSchema>,
    options?: FindOneAndDeleteOptions & { projection?: TProjection }
  ): Promise<ProjectionType<TSchema, TProjection> | null> {
    const result = await this.collection.findOneAndDelete(
      filter as Filter<TSchema>,
      options || {}
    );

    return result as unknown as ProjectionType<TSchema, TProjection>;
  }

  /**
   * Bulk write
   */
  async bulkWrite(
    operations: readonly PaprBulkWriteOperation<TSchema>[],
    options?: BulkWriteOptions
  ): Promise<BulkWriteResult> {
    return this.collection.bulkWrite(operations as AnyBulkWriteOperation<TSchema>[], options);
  }

  /**
   * Count documents
   */
  async countDocuments(
    filter: PaprFilter<TSchema> = {},
    options?: CountDocumentsOptions
  ): Promise<number> {
    return this.collection.countDocuments(filter as Filter<TSchema>, options);
  }

  /**
   * Estimated document count
   */
  async estimatedDocumentCount(
    options?: EstimatedDocumentCountOptions
  ): Promise<number> {
    return this.collection.estimatedDocumentCount(options);
  }

  /**
   * Get distinct values
   */
  async distinct<K extends keyof TSchema>(
    key: K,
    filter: PaprFilter<TSchema> = {},
    options?: DistinctOptions
  ): Promise<TSchema[K][]> {
    return this.collection.distinct(
      key as string,
      filter as Filter<TSchema>,
      options || {}
    );
  }

  /**
   * Aggregate
   */
  aggregate<TResult = any>(
    pipeline: Record<string, unknown>[],
    options?: AggregateOptions
  ): AggregationCursor<TResult> {
    return this.collection.aggregate(pipeline, options) as AggregationCursor<TResult>;
  }
}
