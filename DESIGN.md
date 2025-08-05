# Valibot対応設計書

## 概要

mongo-standard-schemaにValibotサポートを追加し、Clientクラスの初期化時にアダプターファクトリーを指定できるようにする。

## 設計方針

1. **アダプターファクトリーパターン**: Clientクラスのコンストラクタでアダプターファクトリーを必須パラメータとして受け取る
2. **明示的な依存性注入**: デフォルトのアダプターは設定せず、使用するアダプターを明示的に指定する
3. **modelWithAdapterの廃止**: 新しいアーキテクチャでは不要になるため廃止
4. **型安全性の向上**: ジェネリクスを活用して、より強力な型推論を実現

## 実装詳細

### 1. アダプターファクトリーインターフェース

```typescript
// src/adapters/factory.ts
export interface AdapterFactory {
  create<TSchema>(schema: TSchema): SchemaAdapter<any, any>;
  readonly name: string;
}
```

### 2. Zodアダプターファクトリー

```typescript
// src/adapters/zod.ts
export const zodAdapterFactory: AdapterFactory = {
  name: 'zod',
  create<TSchema extends z.ZodType>(schema: TSchema) {
    return new ZodAdapter(schema);
  }
};
```

### 3. Valibotアダプター実装

```typescript
// src/adapters/valibot.ts
import type { BaseSchema, Input, Output } from 'valibot';
import * as v from 'valibot';
import type { SchemaAdapter } from './base.js';
import type { AdapterFactory } from './factory.js';

export class ValibotAdapter<TSchema extends BaseSchema> 
  implements SchemaAdapter<Input<TSchema>, Output<TSchema>> {
  
  constructor(private schema: TSchema) {}
  
  parse(data: unknown): Output<TSchema> {
    return v.parse(this.schema, data);
  }
  
  safeParse(data: unknown): { success: true; data: Output<TSchema> } | { success: false; error: unknown } {
    const result = v.safeParse(this.schema, data);
    if (result.success) {
      return { success: true, data: result.output };
    }
    return { success: false, error: result.issues };
  }
  
  partial(): SchemaAdapter<Partial<Input<TSchema>>, Partial<Output<TSchema>>> {
    // Check if schema is an object schema
    if (!v.is(v.object({}), this.schema)) {
      throw new Error('partial() is only supported for object schemas');
    }
    
    const partialSchema = v.partial(this.schema as any);
    return new ValibotAdapter(partialSchema) as any;
  }
  
  optional(): SchemaAdapter<Input<TSchema> | undefined, Output<TSchema> | undefined> {
    const optionalSchema = v.optional(this.schema);
    return new ValibotAdapter(optionalSchema) as any;
  }
  
  getSchema(): TSchema {
    return this.schema;
  }
  
  parseUpdateFields(fields: Record<string, unknown>): Record<string, unknown> {
    // For object schemas, validate individual fields
    if (!v.is(v.object({}), this.schema)) {
      return fields;
    }
    
    const processedFields: Record<string, unknown> = {};
    const schemaEntries = (this.schema as any).entries || {};
    
    for (const [key, value] of Object.entries(fields)) {
      const fieldSchema = schemaEntries[key];
      if (fieldSchema) {
        try {
          processedFields[key] = v.parse(fieldSchema, value);
        } catch {
          // If parsing fails, use the original value
          processedFields[key] = value;
        }
      } else {
        processedFields[key] = value;
      }
    }
    
    return processedFields;
  }
}

export const valibotAdapterFactory: AdapterFactory = {
  name: 'valibot',
  create<TSchema extends BaseSchema>(schema: TSchema) {
    return new ValibotAdapter(schema);
  }
};
```

### 4. Clientクラスの更新

```typescript
// src/client/index.ts
import type { Db, MongoClient } from 'mongodb';
import type { SchemaAdapter } from '../adapters/base.js';
import type { AdapterFactory } from '../adapters/factory.js';
import { zodAdapterFactory } from '../adapters/zod.js';
import { Model, type ModelOptions } from '../model/index.js';

export class Client<TAdapterFactory extends AdapterFactory = AdapterFactory> {
  private mongoClient: MongoClient | undefined;

  constructor(
    private db: Db,
    private adapterFactory: TAdapterFactory,
    mongoClient?: MongoClient
  ) {
    this.mongoClient = mongoClient;
  }

  /**
   * Initialize client with MongoDB database connection and adapter factory
   */
  static initialize<TAdapterFactory extends AdapterFactory>(
    db: Db,
    adapterFactory: TAdapterFactory,
    mongoClient?: MongoClient
  ): Client<TAdapterFactory> {
    return new Client(db, adapterFactory, mongoClient);
  }

  /**
   * Create a model with schema
   */
  model<TSchema>(
    collectionName: string,
    schema: TSchema,
    options?: ModelOptions,
  ): Model<any, any> {
    const adapter = this.adapterFactory.create(schema);
    return new Model(this.db, collectionName, adapter, options);
  }

  /**
   * Get the underlying MongoDB database instance
   */
  getDb(): Db {
    return this.db;
  }

  /**
   * Get the current adapter factory
   */
  getAdapterFactory(): AdapterFactory {
    return this.adapterFactory;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.mongoClient && typeof this.mongoClient.close === 'function') {
      await this.mongoClient.close();
    }
  }
}
```

### 5. 型定義の改善

```typescript
// src/adapters/factory.ts
export interface TypedAdapterFactory<TSchemaType> {
  create<TSchema extends TSchemaType>(
    schema: TSchema
  ): SchemaAdapter<InferInput<TSchema>, InferOutput<TSchema>>;
  readonly name: string;
}

// 各アダプターで型推論を改善
type InferZodInput<T> = T extends z.ZodType<any, any, infer U> ? U : never;
type InferZodOutput<T> = T extends z.ZodType<infer U, any, any> ? U : never;

type InferValibotInput<T> = T extends BaseSchema ? Input<T> : never;
type InferValibotOutput<T> = T extends BaseSchema ? Output<T> : never;
```

## 使用例

### Zod

```typescript
import { Client } from 'mongo-standard-schema';
import { zodAdapterFactory } from 'mongo-standard-schema/adapters';
import { z } from 'zod';

const userSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const client = new Client(db, zodAdapterFactory);
const users = client.model('users', userSchema);
```

### Valibot

```typescript
import { Client } from 'mongo-standard-schema';
import { valibotAdapterFactory } from 'mongo-standard-schema/adapters';
import * as v from 'valibot';

const userSchema = v.object({
  _id: v.string(),
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
});

const client = new Client(db, valibotAdapterFactory, mongoClient);
const users = client.model('users', userSchema);
```

## 使用パターン

### 複数のアダプターを使い分ける場合

```typescript
// Zodクライアント
const zodClient = new Client(db, zodAdapterFactory);
const zodUsers = zodClient.model('users', zodUserSchema);

// Valibotクライアント
const valibotClient = new Client(db, valibotAdapterFactory);
const valibotProducts = valibotClient.model('products', valibotProductSchema);
```

### アプリケーション全体で統一する場合

```typescript
// app/database.ts
import { Client } from 'mongo-standard-schema';
import { valibotAdapterFactory } from 'mongo-standard-schema/adapters';

export const createClient = (db: Db) => {
  return new Client(db, valibotAdapterFactory);
};

// 使用側
const client = createClient(db);
const users = client.model('users', userSchema);
```

## パッケージ構成

```
mongo-standard-schema/
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   └── adapters/
│       ├── index.js
│       ├── index.d.ts
│       ├── base.js
│       ├── base.d.ts
│       ├── factory.js
│       ├── factory.d.ts
│       ├── zod.js
│       ├── zod.d.ts
│       ├── valibot.js
│       └── valibot.d.ts
└── src/
    └── adapters/
        ├── index.ts
        ├── base.ts
        ├── factory.ts
        ├── zod.ts
        └── valibot.ts
```

## 依存関係

package.jsonの更新:
```json
{
  "peerDependencies": {
    "mongodb": "^5.0.0 || ^6.0.0",
    "zod": "^3.20.0",
    "valibot": ">=0.30.0"
  },
  "peerDependenciesMeta": {
    "zod": {
      "optional": true
    },
    "valibot": {
      "optional": true
    }
  }
}
```

## テスト計画

1. **単体テスト**
   - ValibotAdapterの各メソッドのテスト
   - アダプターファクトリーのテスト
   - Clientクラスの新しいコンストラクタのテスト

2. **統合テスト**
   - Valibotを使用したCRUD操作
   - ZodからValibotへの切り替えテスト
   - 型推論のテスト

3. **互換性テスト**
   - 既存のZod使用コードが動作することを確認
   - modelWithAdapter廃止の影響確認