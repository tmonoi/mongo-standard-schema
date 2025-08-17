import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Model } from '../../src/model/index.js';
import { ObjectId } from 'mongodb';
import type { Db, Collection } from 'mongodb';
import type { Adapter } from '../../src/adapters/base.js';

// Define test types
interface TestDoc {
  _id?: string;  // Make _id optional for insert operations
  name?: string;
  age?: number;
  status?: string;
  tags?: string[];
  createdAt?: Date;  // Add createdAt for $setOnInsert test
}

// Mocks
const mockCollection = {
  insertOne: vi.fn(),
  insertMany: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn().mockReturnValue({ toArray: vi.fn() }),
  updateOne: vi.fn(),
  updateMany: vi.fn(),
  findOneAndUpdate: vi.fn(),
  deleteOne: vi.fn(),
  deleteMany: vi.fn(),
  findOneAndDelete: vi.fn(),
  countDocuments: vi.fn(),
  distinct: vi.fn(),
};

const mockDb = {
  collection: vi.fn().mockReturnValue(mockCollection),
};

const mockAdapter = {
  parse: vi.fn((data) => data),
  getIdFieldType: vi.fn().mockReturnValue('string'),
  validateForInsert: vi.fn((data) => ({ value: data, issues: undefined } as any)),
  parseUpdateFields: vi.fn((fields) => fields),
};

describe('Model', () => {
  let model: Model<TestDoc, TestDoc>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter.parse.mockImplementation((data) => data);
    mockAdapter.validateForInsert.mockImplementation((data) => ({ value: data, issues: undefined } as any));
    mockAdapter.parseUpdateFields.mockImplementation((fields) => fields);
    model = new Model(mockDb as unknown as Db, 'test', mockAdapter as unknown as Adapter<TestDoc, TestDoc>);
  });

  describe('insertOne', () => {
    test('should insert a document with validation', async () => {
      const doc = { name: 'test' };
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ 
        acknowledged: true,
        insertedId 
      });

      const result = await model.insertOne(doc);

      expect(mockAdapter.validateForInsert).toHaveBeenCalledWith(doc);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(doc, undefined);
      expect(result).toEqual({ ...doc, _id: insertedId });
    });

    test('should insert a document with a provided _id', async () => {
      const docId = new ObjectId().toString();
      const doc = { _id: docId, name: 'test' };
      mockCollection.insertOne.mockResolvedValue({ 
        acknowledged: true,
        insertedId: new ObjectId(docId) 
      });

      const result = await model.insertOne(doc);

      expect(mockAdapter.validateForInsert).toHaveBeenCalledWith(doc);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(doc, undefined);
      expect(result).toEqual({ ...doc, _id: new ObjectId(docId) });
    });

    test('should throw if validation fails', async () => {
      const doc = { name: 'test' };
      const issues = [{ message: 'Validation failed' }];
      mockAdapter.validateForInsert.mockReturnValue({ value: undefined, issues } as any);

      await expect(model.insertOne(doc)).rejects.toThrow('Validation failed');
      expect(mockAdapter.validateForInsert).toHaveBeenCalledWith(doc);
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    test('should throw if insert is not acknowledged', async () => {
      const doc = { name: 'test' };
      mockCollection.insertOne.mockResolvedValue({ 
        acknowledged: false 
      });

      await expect(model.insertOne(doc)).rejects.toThrow('insertOne failed');
    });
  });

  describe('insertMany', () => {
    test('should insert multiple documents with validation', async () => {
      const docs = [
        { name: 'test1' },
        { name: 'test2' }
      ];
      const insertedIds = { '0': new ObjectId(), '1': new ObjectId() };
      mockCollection.insertMany.mockResolvedValue({ 
        acknowledged: true,
        insertedCount: 2,
        insertedIds 
      });

      const result = await model.insertMany(docs);

      expect(mockAdapter.validateForInsert).toHaveBeenCalledTimes(2);
      expect(mockAdapter.validateForInsert).toHaveBeenCalledWith(docs[0]);
      expect(mockAdapter.validateForInsert).toHaveBeenCalledWith(docs[1]);
      expect(mockCollection.insertMany).toHaveBeenCalled();
      expect(result.insertedCount).toBe(2);
    });

    test('should throw if any document validation fails', async () => {
      const docs = [
        { name: 'test1' },
        { name: 'test2' }
      ];
      const issues = [{ message: 'Validation failed' }];
      mockAdapter.validateForInsert
        .mockReturnValueOnce({ value: docs[0], issues: undefined } as any)
        .mockReturnValueOnce({ value: undefined, issues } as any);

      await expect(model.insertMany(docs)).rejects.toThrow('Validation failed');
      expect(mockAdapter.validateForInsert).toHaveBeenCalledTimes(2);
      expect(mockCollection.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    test('should find a document', async () => {
      const filter = { name: 'test' };
      const doc = { _id: new ObjectId(), name: 'test' };
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await model.findOne(filter);

      expect(mockCollection.findOne).toHaveBeenCalledWith(filter, undefined);
      expect(result).toEqual(doc);
    });

    test('should return null if document not found', async () => {
      const filter = { name: 'test' };
      mockCollection.findOne.mockResolvedValue(null);

      const result = await model.findOne(filter);

      expect(result).toBeNull();
    });
  });

  describe('find', () => {
    test('should find multiple documents', async () => {
      const filter = { age: { $gt: 20 } };
      const docs = [
        { _id: new ObjectId(), name: 'test1', age: 21 },
        { _id: new ObjectId(), name: 'test2', age: 22 },
      ];
      mockCollection.find.mockReturnValue({ toArray: async () => docs });

      const result = await model.find(filter);

      expect(mockCollection.find).toHaveBeenCalledWith(filter, undefined);
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('test1');
    });
  });

  describe('updateOne', () => {
    test('should update a document with parseUpdateFields', async () => {
      const filter = { name: 'test' };
      const update = { $set: { name: 'updated' } };
      const processedUpdate = { $set: { name: 'processed_updated' } };
      mockAdapter.parseUpdateFields.mockReturnValue({ name: 'processed_updated' });
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const result = await model.updateOne(filter, update);

      expect(mockAdapter.parseUpdateFields).toHaveBeenCalledWith({ name: 'updated' });
      expect(mockCollection.updateOne).toHaveBeenCalledWith(filter, processedUpdate, undefined);
      expect(result.modifiedCount).toBe(1);
    });

    test('should handle update without $set', async () => {
      const filter = { name: 'test' };
      const update = { $inc: { age: 1 } };
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const result = await model.updateOne(filter, update);

      expect(mockAdapter.parseUpdateFields).not.toHaveBeenCalled();
      expect(mockCollection.updateOne).toHaveBeenCalledWith(filter, update, undefined);
      expect(result.modifiedCount).toBe(1);
    });
  });

  describe('updateMany', () => {
    test('should update multiple documents with parseUpdateFields', async () => {
      const filter = { status: 'old' };
      const update = { $set: { status: 'new' } };
      const processedUpdate = { $set: { status: 'processed_new' } };
      mockAdapter.parseUpdateFields.mockReturnValue({ status: 'processed_new' });
      mockCollection.updateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });

      const result = await model.updateMany(filter, update);

      expect(mockAdapter.parseUpdateFields).toHaveBeenCalledWith({ status: 'new' });
      expect(mockCollection.updateMany).toHaveBeenCalledWith(filter, processedUpdate, undefined);
      expect(result.modifiedCount).toBe(2);
    });

    test('should process $setOnInsert operation', async () => {
      const filter = { name: 'test' };
      const update = { $setOnInsert: { createdAt: new Date() } };
      const processedDate = new Date('2024-01-01');
      mockAdapter.parseUpdateFields.mockReturnValue({ createdAt: processedDate });
      mockCollection.updateMany.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

      await model.updateMany(filter, update);

      expect(mockAdapter.parseUpdateFields).toHaveBeenCalledWith(update.$setOnInsert);
      expect(mockCollection.updateMany).toHaveBeenCalledWith(
        filter,
        { $setOnInsert: { createdAt: processedDate } },
        undefined
      );
    });
  });

  describe('findOneAndUpdate', () => {
    test('should find and update a document with parseUpdateFields', async () => {
      const filter = { name: 'test' };
      const update = { $set: { name: 'updated' } };
      const processedUpdate = { $set: { name: 'processed_updated' } };
      mockAdapter.parseUpdateFields.mockReturnValue({ name: 'processed_updated' });
      const doc = { _id: new ObjectId(), name: 'processed_updated' };
      mockCollection.findOneAndUpdate.mockResolvedValue(doc);

      const result = await model.findOneAndUpdate(filter, update);

      expect(mockAdapter.parseUpdateFields).toHaveBeenCalledWith({ name: 'updated' });
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        filter,
        processedUpdate,
        { returnDocument: 'after' }
      );
      expect(result?.name).toBe('processed_updated');
    });

    test('should pass options correctly', async () => {
      const filter = { name: 'test' };
      const update = { $set: { name: 'updated' } };
      const options = { upsert: true };
      mockAdapter.parseUpdateFields.mockReturnValue({ name: 'updated' });
      mockCollection.findOneAndUpdate.mockResolvedValue(null);

      await model.findOneAndUpdate(filter, update, options);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        filter,
        { $set: { name: 'updated' } },
        { returnDocument: 'after', upsert: true }
      );
    });
  });

  describe('deleteOne', () => {
    test('should delete a document', async () => {
      const filter = { name: 'test' };
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await model.deleteOne(filter);

      expect(mockCollection.deleteOne).toHaveBeenCalledWith(filter, undefined);
      expect(result.deletedCount).toBe(1);
    });
  });

  describe('deleteMany', () => {
    test('should delete multiple documents', async () => {
      const filter = { status: 'old' };
      mockCollection.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const result = await model.deleteMany(filter);

      expect(mockCollection.deleteMany).toHaveBeenCalledWith(filter, undefined);
      expect(result.deletedCount).toBe(2);
    });
  });

  describe('findOneAndDelete', () => {
    test('should find and delete a document', async () => {
      const filter = { name: 'test' };
      const doc = { _id: new ObjectId(), name: 'test' };
      mockCollection.findOneAndDelete.mockResolvedValue(doc);

      const result = await model.findOneAndDelete(filter);

      expect(mockCollection.findOneAndDelete).toHaveBeenCalledWith(filter, {});
      expect(result?.name).toBe('test');
    });
  });

  describe('countDocuments', () => {
    test('should count documents', async () => {
      const filter = { name: 'test' };
      mockCollection.countDocuments.mockResolvedValue(5);

      const result = await model.countDocuments(filter);

      expect(mockCollection.countDocuments).toHaveBeenCalledWith(filter, undefined);
      expect(result).toBe(5);
    });

    test('should count all documents with empty filter', async () => {
      mockCollection.countDocuments.mockResolvedValue(10);

      const result = await model.countDocuments();

      expect(mockCollection.countDocuments).toHaveBeenCalledWith({}, undefined);
      expect(result).toBe(10);
    });
  });

  describe('distinct', () => {
    test('should return distinct values', async () => {
      const key = 'name';
      const filter = {};
      const values = ['test1', 'test2'];
      mockCollection.distinct.mockResolvedValue(values);

      const result = await model.distinct(key, filter);

      expect(mockCollection.distinct).toHaveBeenCalledWith(key, filter);
      expect(result).toEqual(values);
    });

    test('should work with default empty filter', async () => {
      const key = 'status';
      const values = ['active', 'inactive'];
      mockCollection.distinct.mockResolvedValue(values);

      const result = await model.distinct(key);

      expect(mockCollection.distinct).toHaveBeenCalledWith(key, {});
      expect(result).toEqual(values);
    });
  });
});