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
} from "mongodb";
import type {
  StrictOptionalId,
  PaprFilter,
  PaprUpdateFilter,
  Projection,
  ProjectionType,
  BaseSchema,
} from "./types.js";

/**
 * Model class that provides type-safe MongoDB operations
 */
export class Model<TSchema extends BaseSchema> {
  private collection: Collection<TSchema>;

  constructor(db: Db, collectionName: string) {
    this.collection = db.collection(collectionName);
  }

  /**
   * Find a single document
   */
  async findOne<TProjection extends Projection<TSchema> | undefined>(
    filter: PaprFilter<TSchema>,
    options?: FindOptions<TSchema> & { projection?: TProjection }
  ): Promise<ProjectionType<TSchema, TProjection> | null> {
    const result = await this.collection.findOne(
      filter as Filter<Document>,
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
      filter as Filter<Document>,
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
    const cursor = this.collection.find(filter as Filter<Document>, options);
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
  ): Promise<InsertManyResult> {
    return this.collection.insertMany(
      docs as unknown as OptionalUnlessRequiredId<TSchema>[],
      options
    ) as unknown as InsertManyResult;
  }

  /**
   * Update a single document
   */
  async updateOne(
    filter: PaprFilter<TSchema>,
    update: PaprUpdateFilter<TSchema>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    return this.collection.updateOne(
      filter as Filter<Document>,
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
  ): Promise<UpdateResult> {
    return this.collection.updateMany(
      filter as Filter<Document>,
      update as UpdateFilter<TSchema>,
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
      filter as Filter<Document>,
      update as UpdateFilter<TSchema>,
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
    return this.collection.deleteOne(filter as Filter<Document>, options);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    filter: PaprFilter<TSchema>,
    options?: DeleteOptions
  ): Promise<DeleteResult> {
    return this.collection.deleteMany(filter as Filter<Document>, options);
  }

  /**
   * Find and delete a single document
   */
  async findOneAndDelete<TProjection extends Projection<TSchema> | undefined>(
    filter: PaprFilter<TSchema>,
    options?: FindOneAndDeleteOptions
  ): Promise<ProjectionType<TSchema, TProjection> | null> {
    const result = await this.collection.findOneAndDelete(
      filter as Filter<Document>,
      options || {}
    );

    return result as unknown as ProjectionType<TSchema, TProjection>;
  }

  /**
   * Count documents
   */
  async countDocuments(
    filter: PaprFilter<TSchema> = {},
    options?: CountDocumentsOptions
  ): Promise<number> {
    return this.collection.countDocuments(filter as Filter<Document>, options);
  }

  /**
   * Get distinct values
   */
  async distinct<K extends keyof TSchema>(
    key: K,
    filter: PaprFilter<TSchema> = {}
  ): Promise<TSchema[K][]> {
    return this.collection.distinct(key as string, filter as Filter<Document>);
  }
}
