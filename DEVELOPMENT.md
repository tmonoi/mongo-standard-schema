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

### 4. テスト戦略

**テストの種類**:
1. **単体テスト**: 各アダプターの機能を個別にテスト
2. **統合テスト**: 実際のMongoDBとの連携をテスト
3. **型チェックテスト**: `@ts-expect-error`を使用して型エラーが正しく検出されることを確認

**型チェックテストの例**:
```typescript
// @ts-expect-error - missing required field
await User.insertOne({ age: 30 });
```

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