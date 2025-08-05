# mongo-standard-schema 開発ガイド

このドキュメントは、mongo-standard-schemaの開発における重要な実装上の注意点と設計決定をまとめたものです。

## 概要

mongo-standard-schemaは、MongoDBクライアントライブラリで、複数のバリデーションライブラリ（Zod、Valibot）をサポートし、型安全性と型推論を提供します。

## アーキテクチャ

### アダプターパターン

このライブラリは、異なるバリデーションライブラリを統一的に扱うためにアダプターパターンを採用しています。

```
Client → AdapterFactory → SchemaAdapter → ValidationLibrary (Zod/Valibot)
```

### 主要コンポーネント

1. **Client**: メインのエントリーポイント。AdapterFactoryを受け取り、Modelを生成
2. **AdapterFactory**: スキーマからSchemaAdapterを生成するファクトリー
3. **SchemaAdapter**: バリデーションライブラリの機能を抽象化したインターフェース
4. **Model**: MongoDBコレクションに対する型安全な操作を提供

## 実装上の重要な注意点

### 1. 型推論の実装

**問題**: TypeScriptの型推論が正しく動作しない場合がある

**解決策**:
- スキーマの型を直接チェックする方法を採用
- 条件型を使用してZodとValibotのスキーマを判別

```typescript
type InferModelTypes<TSchema> =
  TSchema extends z.ZodType<any, any, any>
    ? { input: z.input<TSchema>; output: z.output<TSchema> }
    : TSchema extends BaseSchema<any, any, any>
    ? { input: VInferInput<TSchema>; output: VInferOutput<TSchema> }
    : { input: any; output: any };
```

### 2. AdapterFactoryの型定義

**現在の実装**:
```typescript
export interface AdapterFactory<TSchemaType = any> {
  create<TSchema extends TSchemaType>(schema: TSchema): SchemaAdapter<any, any>;
}
```

**注意点**:
- `TSchemaType`はファクトリーが受け入れるスキーマの型を制約
- 各バリデーションライブラリ用に特化したファクトリーインターフェースを定義

### 3. 型安全性の確保

**重要な原則**:
- ユーザー向けAPIでは`_id`は常に文字列として扱う
- 内部的にはMongoDBのObjectIdに変換
- 型推論は可能な限り自動化し、手動での型定義を不要にする
- **`any`型の使用を避ける**: 型安全性を損なうため、`unknown`や適切なジェネリクスを使用

**`any`型を避ける理由**:
- 型チェックが無効になり、実行時エラーの原因となる
- IDEの補完機能が働かなくなる
- リファクタリング時に問題を見逃しやすくなる

**代替案**:
```typescript
// ❌ 悪い例
export interface AdapterFactory<TSchemaType = any> {
  create<TSchema extends TSchemaType>(schema: TSchema): SchemaAdapter<any, any>;
}

// ✅ 良い例
export interface AdapterFactory<TSchemaType = unknown> {
  create<TSchema extends TSchemaType>(
    schema: TSchema
  ): SchemaAdapter<InferInput<TSchema>, InferOutput<TSchema>>;
}
```

### 4. テスト戦略

**テストの種類**:
1. **単体テスト**: 各アダプターの機能を個別にテスト
2. **統合テスト**: 実際のMongoDBとの連携をテスト
3. **型チェックテスト**: `@ts-expect-error`を使用して型エラーが正しく検出されることを確認

#### typecheck_testの目的

`tests/typecheck/typecheck_test.ts`は、TypeScriptの型システムが正しく動作していることを確認するための特別なテストファイルです。

**主な目的**:
1. **型推論の検証**: 型が正しく推論されているか確認
2. **型エラーの検出**: 不正な型の使用が適切にエラーになるか確認
3. **APIの型安全性**: ユーザーが間違った使い方をした時にコンパイルエラーになるか確認

**実装方法**:
```typescript
describe.skip('This is a typecheck test so type check only.', () => {
  test('should provide proper TypeScript type checking', async () => {
    // ✅ 正しい使用例 - エラーが出ないことを確認
    const validUser = await User.insertOne({
      name: 'John',
      age: 30,
    });

    // ❌ 間違った使用例 - エラーが出ることを確認
    // @ts-expect-error - missing required field 'name'
    await User.insertOne({
      age: 30,
    });

    // @ts-expect-error - wrong type for 'age'
    await User.insertOne({
      name: 'Alice',
      age: 'thirty', // 数値であるべき
    });
  });
});
```

**重要な注意点**:
- `describe.skip`を使用して実行時はスキップ（型チェックのみ実行）
- `@ts-expect-error`コメントは、その次の行でTypeScriptエラーが発生することを期待
- エラーが発生しない場合、`@ts-expect-error`自体がエラーになる（未使用の抑制）
- これにより、型システムの退行を防ぐことができる

### 5. エラーハンドリング

**バリデーションエラー**:
- 各バリデーションライブラリのエラーを統一的に扱う
- エラーメッセージはライブラリ固有のものをそのまま使用

### 6. パフォーマンス考慮事項

**parseOnFindオプション**:
- デフォルトでは`false`（パフォーマンス優先）
- `true`にすると、find操作でもスキーマバリデーションを実行

## 将来の拡張性

### Standard Schemaへの移行

Standard Schemaは、異なるバリデーションライブラリ間で共通のインターフェースを提供する仕様です。

**メリット**:
- 統一されたインターフェース
- 新しいバリデーションライブラリの追加が容易
- 型推論の簡素化

**実装例**:
```typescript
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly types: {
      readonly input: Input;
      readonly output: Output;
    };
  };
}
```

### 新しいバリデーションライブラリの追加

新しいバリデーションライブラリを追加する場合：

1. `SchemaAdapter`インターフェースを実装
2. `AdapterFactory`を実装
3. 型推論ロジックを更新（必要に応じて）
4. テストを追加

## 開発フロー

### 1. 環境セットアップ

```bash
pnpm install
```

### 2. 開発

```bash
# ビルド
pnpm run build

# テスト
pnpm test

# 型チェック
pnpm run typecheck

# リント
pnpm run lint
```

### 3. テストの実行

```bash
# 単体テスト
pnpm run test:unit

# 統合テスト
pnpm run test:integration

# すべてのテスト
pnpm test
```

## トラブルシューティング

### 型推論が機能しない

1. TypeScriptのバージョンを確認（5.0以上が必要）
2. `tsconfig.json`の設定を確認
3. 条件型の評価順序を確認

### テストが失敗する

1. MongoDBが起動していることを確認
2. 環境変数が正しく設定されていることを確認
3. 依存関係が最新であることを確認

## ベストプラクティス

1. **型の明示的な指定を避ける**: 型推論に頼る
2. **エラーメッセージを改善**: ユーザーフレンドリーなエラーメッセージを提供
3. **後方互換性を保つ**: APIの変更は慎重に
4. **ドキュメントを更新**: コードの変更に合わせてドキュメントも更新

## 参考資料

- [Zod Documentation](https://zod.dev/)
- [Valibot Documentation](https://valibot.dev/)
- [Standard Schema Specification](https://github.com/standard-schema/standard-schema)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)