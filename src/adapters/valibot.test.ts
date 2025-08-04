import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { ValibotAdapter, valibotAdapter, valibotAdapterFactory } from './valibot.js';

describe('ValibotAdapter', () => {
  const userSchema = v.object({
    _id: v.string(),
    name: v.string(),
    age: v.pipe(v.number(), v.minValue(0)),
    email: v.pipe(v.string(), v.email()),
  });

  describe('parse', () => {
    it('should parse valid data', () => {
      const adapter = new ValibotAdapter(userSchema);
      const data = {
        _id: '123',
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = adapter.parse(data);
      expect(result).toEqual(data);
    });

    it('should throw on invalid data', () => {
      const adapter = new ValibotAdapter(userSchema);
      const invalidData = {
        _id: '123',
        name: 'John Doe',
        age: -5, // Invalid: negative age
        email: 'invalid-email', // Invalid: not an email
      };

      expect(() => adapter.parse(invalidData)).toThrow();
    });
  });

  describe('safeParse', () => {
    it('should return success for valid data', () => {
      const adapter = new ValibotAdapter(userSchema);
      const data = {
        _id: '123',
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = adapter.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it('should return error for invalid data', () => {
      const adapter = new ValibotAdapter(userSchema);
      const invalidData = {
        _id: '123',
        name: 'John Doe',
        age: -5,
        email: 'invalid-email',
      };

      const result = adapter.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('partial', () => {
    it('should create a partial schema adapter', () => {
      const adapter = new ValibotAdapter(userSchema);
      const partialAdapter = adapter.partial();

      const partialData = {
        _id: '123',
        name: 'John Doe',
        // age and email are optional
      };

      const result = partialAdapter.parse(partialData);
      expect(result).toEqual(partialData);
    });

    it('should throw for non-object schemas', () => {
      const stringSchema = v.string();
      const adapter = new ValibotAdapter(stringSchema);

      expect(() => adapter.partial()).toThrow('partial() is only supported for object schemas');
    });
  });

  describe('optional', () => {
    it('should create an optional schema adapter', () => {
      const adapter = new ValibotAdapter(userSchema);
      const optionalAdapter = adapter.optional();

      expect(optionalAdapter.parse(undefined)).toBeUndefined();
      
      const data = {
        _id: '123',
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };
      expect(optionalAdapter.parse(data)).toEqual(data);
    });
  });

  describe('getSchema', () => {
    it('should return the original schema', () => {
      const adapter = new ValibotAdapter(userSchema);
      expect(adapter.getSchema()).toBe(userSchema);
    });
  });

  describe('parseUpdateFields', () => {
    it('should validate individual fields for object schemas', () => {
      const adapter = new ValibotAdapter(userSchema);
      const fields = {
        age: 35,
        email: 'newemail@example.com',
      };

      const result = adapter.parseUpdateFields(fields);
      expect(result).toEqual(fields);
    });

    it('should use original value if validation fails', () => {
      const adapter = new ValibotAdapter(userSchema);
      const fields = {
        age: -10, // Invalid
        email: 'valid@example.com',
      };

      const result = adapter.parseUpdateFields(fields);
      expect(result).toEqual({
        age: -10, // Original value kept
        email: 'valid@example.com',
      });
    });

    it('should return fields as-is for non-object schemas', () => {
      const stringSchema = v.string();
      const adapter = new ValibotAdapter(stringSchema);
      const fields = { foo: 'bar' };

      const result = adapter.parseUpdateFields(fields);
      expect(result).toEqual(fields);
    });
  });

  describe('valibotAdapter helper', () => {
    it('should create a ValibotAdapter instance', () => {
      const adapter = valibotAdapter(userSchema);
      expect(adapter).toBeInstanceOf(ValibotAdapter);
    });
  });

  describe('valibotAdapterFactory', () => {
    it('should have correct name', () => {
      expect(valibotAdapterFactory.name).toBe('valibot');
    });

    it('should create a ValibotAdapter instance', () => {
      const adapter = valibotAdapterFactory.create(userSchema);
      expect(adapter).toBeInstanceOf(ValibotAdapter);
    });
  });
});