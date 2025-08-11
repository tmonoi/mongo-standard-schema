import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Model } from '../../src/model/index.js';
import { ObjectId } from 'mongodb';
import type { Db, Collection } from 'mongodb';
import type { Adapter } from '../../src/adapters/base.js';

// Define test types
interface TestDoc {
  _id: string;
  name?: string;
  age?: number;
  status?: string;
  tags?: string[];
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
  safeParse: vi.fn(),
  partial: vi.fn(),
  optional: vi.fn(),
  getSchema: vi.fn(),
  getIdFieldType: vi.fn().mockReturnValue('string'),
};

describe('Model', () => {
  let model: Model<TestDoc, TestDoc>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter.parse.mockImplementation((data) => data);
    model = new Model(mockDb as unknown as Db, 'test', mockAdapter as unknown as Adapter<TestDoc, TestDoc>);
  });

  describe('Model with parseOnFind option', () => {
    test('should not parse by default (parseOnFind: false)', async () => {
      const doc = { _id: new ObjectId(), name: 'test' };
      mockCollection.findOne.mockResolvedValue(doc);

      await model.findOne({ name: 'test' });

      expect(mockAdapter.parse).not.toHaveBeenCalled();
    });

    test('should parse when parseOnFind is true', async () => {
      const modelWithParse = new Model(mockDb as unknown as Db, 'test', mockAdapter as unknown as Adapter<TestDoc, TestDoc>, { parseOnFind: true });
      const doc = { _id: new ObjectId(), name: 'test' };
      mockCollection.findOne.mockResolvedValue(doc);

      await modelWithParse.findOne({ name: 'test' });

      expect(mockAdapter.parse).toHaveBeenCalled();
    });
  });

  describe('insertOne', () => {
    test('should insert a document with a provided _id', async () => {
      const doc = { _id: new ObjectId().toString(), name: 'test' };
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const result = await model.insertOne(doc);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(mockAdapter.parse).toHaveBeenCalledWith(doc);
      expect(result).toEqual(doc);
    });

    test('should insert a document with a provided _id', async () => {
      const doc = { _id: new ObjectId().toString(), name: 'test' };
      mockCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId(doc._id) });

      const result = await model.insertOne(doc);

      expect(mockAdapter.parse).toHaveBeenCalledWith(doc);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(doc, undefined);
      expect(result).toEqual(doc);
    });

    test('should throw if adapter parsing fails', async () => {
      const doc = { _id: new ObjectId().toString(), name: 'test' };
      const error = new Error('Validation failed');
      mockAdapter.parse.mockImplementation(() => {
        throw error;
      });
      mockCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

      await expect(model.insertOne(doc)).rejects.toThrow(error);
    });
  });

  describe('insertMany', () => {
    test('should insert multiple documents', async () => {
      const docs = [
        { _id: new ObjectId().toString(), name: 'test1' },
        { _id: new ObjectId().toString(), name: 'test2' }
      ];
      const insertedIds = { '0': new ObjectId(), '1': new ObjectId() };
      mockCollection.insertMany.mockResolvedValue({ insertedIds });

      const result = await model.insertMany(docs);

      expect(mockCollection.insertMany).toHaveBeenCalled();
      expect(mockAdapter.parse).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('test1');
      expect(result[1]?.name).toBe('test2');
    });
  });

  describe('findOne', () => {
    test('should find a document without parsing by default', async () => {
      const filter = { name: 'test' };
      const doc = { _id: new ObjectId(), name: 'test' };
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await model.findOne(filter);

      expect(mockCollection.findOne).toHaveBeenCalledWith(filter, undefined);
      expect(mockAdapter.parse).not.toHaveBeenCalled();
      expect(result).toEqual({ ...doc, _id: doc._id.toString() });
    });

    test('should find a document with parsing when parseOnFind is true', async () => {
      const modelWithParse = new Model(mockDb as unknown as Db, 'test', mockAdapter as unknown as Adapter<TestDoc, TestDoc>, { parseOnFind: true });
      const filter = { name: 'test' };
      const doc = { _id: new ObjectId(), name: 'test' };
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await modelWithParse.findOne(filter);

      expect(mockCollection.findOne).toHaveBeenCalledWith(filter, undefined);
      expect(mockAdapter.parse).toHaveBeenCalledWith({ ...doc, _id: doc._id.toString() });
      expect(result).toEqual({ ...doc, _id: doc._id.toString() });
    });

    test('should return null if document not found', async () => {
      const filter = { name: 'test' };
      mockCollection.findOne.mockResolvedValue(null);

      const result = await model.findOne(filter);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    test('should find a document by string id', async () => {
      const id = new ObjectId().toString();
      const doc = { _id: new ObjectId(id), name: 'test' };
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await model.findById(id);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: id }, undefined);
      expect(result).toEqual({ ...doc, _id: id });
    });
  });

  describe('find', () => {
    test('should find multiple documents without parsing by default', async () => {
      const filter = { age: { $gt: 20 } };
      const docs = [
        { _id: new ObjectId(), name: 'test1', age: 21 },
        { _id: new ObjectId(), name: 'test2', age: 22 },
      ];
      mockCollection.find.mockReturnValue({ toArray: async () => docs });

      const result = await model.find(filter);

      expect(mockCollection.find).toHaveBeenCalledWith(filter, undefined);
      expect(mockAdapter.parse).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('test1');
    });

    test('should find multiple documents with parsing when parseOnFind is true', async () => {
      const modelWithParse = new Model(mockDb as unknown as Db, 'test', mockAdapter as unknown as Adapter<TestDoc, TestDoc>, { parseOnFind: true });
      const filter = { age: { $gt: 20 } };
      const docs = [
        { _id: new ObjectId(), name: 'test1', age: 21 },
        { _id: new ObjectId(), name: 'test2', age: 22 },
      ];
      mockCollection.find.mockReturnValue({ toArray: async () => docs });

      const result = await modelWithParse.find(filter);

      expect(mockCollection.find).toHaveBeenCalledWith(filter, undefined);
      expect(mockAdapter.parse).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  describe('updateOne', () => {
    test('should update a document', async () => {
      const filter = { name: 'test' };
      const update = { $set: { name: 'updated' } };
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } );

      const result = await model.updateOne(filter, update);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(filter, update, undefined);
      expect(result.modifiedCount).toBe(1);
    });
  });

  describe('updateMany', () => {
    test('should update multiple documents', async () => {
      const filter = { status: 'old' };
      const update = { $set: { status: 'new' } };
      mockCollection.updateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });

      const result = await model.updateMany(filter, update);

      expect(mockCollection.updateMany).toHaveBeenCalledWith(filter, update, undefined);
      expect(result.modifiedCount).toBe(2);
    });
  });

  describe('findOneAndUpdate', () => {
    test('should find and update a document without parsing by default', async () => {
      const filter = { name: 'test' };
      const update = { $set: { name: 'updated' } };
      const doc = { _id: new ObjectId(), name: 'updated' };
      mockCollection.findOneAndUpdate.mockResolvedValue(doc);

      const result = await model.findOneAndUpdate(filter, update);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(mockAdapter.parse).not.toHaveBeenCalled();
      expect(result?.name).toBe('updated');
    });

    test('should find and update a document with parsing when parseOnFind is true', async () => {
      const modelWithParse = new Model(mockDb as unknown as Db, 'test', mockAdapter as unknown as Adapter<TestDoc, TestDoc>, { parseOnFind: true });
      const filter = { name: 'test' };
      const update = { $set: { name: 'updated' } };
      const doc = { _id: new ObjectId(), name: 'updated' };
      mockCollection.findOneAndUpdate.mockResolvedValue(doc);

      const result = await modelWithParse.findOneAndUpdate(filter, update);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(mockAdapter.parse).toHaveBeenCalled();
      expect(result?.name).toBe('updated');
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
    test('should find and delete a document without parsing by default', async () => {
      const filter = { name: 'test' };
      const doc = { _id: new ObjectId(), name: 'test' };
      mockCollection.findOneAndDelete.mockResolvedValue(doc);

      const result = await model.findOneAndDelete(filter);

      expect(mockCollection.findOneAndDelete).toHaveBeenCalled();
      expect(mockAdapter.parse).not.toHaveBeenCalled();
      expect(result?.name).toBe('test');
    });

    test('should find and delete a document with parsing when parseOnFind is true', async () => {
      const modelWithParse = new Model(mockDb as unknown as Db, 'test', mockAdapter as unknown as Adapter<TestDoc, TestDoc>, { parseOnFind: true });
      const filter = { name: 'test' };
      const doc = { _id: new ObjectId(), name: 'test' };
      mockCollection.findOneAndDelete.mockResolvedValue(doc);

      const result = await modelWithParse.findOneAndDelete(filter);

      expect(mockCollection.findOneAndDelete).toHaveBeenCalled();
      expect(mockAdapter.parse).toHaveBeenCalled();
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
  });

  describe('exists', () => {
    test('should return true if documents exist', async () => {
      const filter = { name: 'test' };
      mockCollection.countDocuments.mockResolvedValue(1);

      const result = await model.exists(filter);

      expect(result).toBe(true);
    });

    test('should return false if no documents exist', async () => {
      const filter = { name: 'test' };
      mockCollection.countDocuments.mockResolvedValue(0);

      const result = await model.exists(filter);

      expect(result).toBe(false);
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
  });
});