# NPM公開手順ガイド

このドキュメントでは、`@minimalcorp/gcpb`パッケージをnpmに公開するための準備手順と公開方法を説明します。

## 事前準備

### 1. NPMアカウントの準備

1. [npmjs.com](https://www.npmjs.com/)でアカウントを作成（既にある場合はログイン）
2. 2要素認証（2FA）の設定を強く推奨
   - Settings → Two-Factor Authentication から設定

### 2. NPMアクセストークンの作成

1. npmにログインし、右上のアイコンから **Access Tokens** を選択
2. **Generate New Token** → **Classic Token** を選択
3. トークン設定:
   - **Token Type**: `Automation`
   - このトークンタイプはCI/CD環境での使用に適しています
4. **Generate Token** をクリック
5. **重要**: 表示されたトークンをコピー（このタイミングでしか表示されません）

### 3. GitHub Secretsの設定

1. GitHubリポジトリページに移動
2. **Settings** → **Secrets and variables** → **Actions** を選択
3. **New repository secret** をクリック
4. シークレット情報を入力:
   - **Name**: `NPM_TOKEN`
   - **Secret**: 先ほどコピーしたnpmトークン
5. **Add secret** をクリック

### 4. Organization設定（@minimalcorp）

スコープ付きパッケージ（`@minimalcorp/gcpb`）を公開するには、npm上で`@minimalcorp` organizationのメンバーである必要があります。

1. npm organizationページで確認: https://www.npmjs.com/settings/minimalcorp/members
2. メンバーでない場合は、organization管理者に追加をリクエスト
3. 必要な権限: `Developer`以上（Publishが可能）

## 公開手順

### 自動公開（推奨）

GitタグをpushするだけでGitHub Actionsが自動的にnpmへ公開します。

1. **バージョン番号の更新**
   ```bash
   # package.jsonのversionフィールドを更新
   # 例: "0.1.0" → "0.2.0"
   ```

2. **変更をコミット**
   ```bash
   git add package.json
   git commit -m "chore: bump version to 0.2.0"
   git push origin main
   ```

3. **タグの作成とpush**
   ```bash
   # ⚠️ 重要: package.jsonのバージョンと一致させる（vプレフィックス付き）
   # package.json が "0.2.0" なら、タグは "v0.2.0"
   git tag v0.2.0
   git push origin v0.2.0
   ```

   **⚠️ バージョンチェック**: GitHub Actionsは自動的にタグのバージョン（例: v0.2.0）とpackage.jsonのバージョン（例: 0.2.0）が一致しているか確認します。不一致の場合はエラーで停止します。

4. **公開の確認**
   - GitHubの **Actions** タブでワークフローの進行状況を確認
   - 完了後、https://www.npmjs.com/package/@minimalcorp/gcpb で確認

### 手動公開（非推奨）

緊急時やテスト目的の場合のみ:

```bash
npm login
npm run build
npm publish --access public
```

**注意**: 手動公開ではprovenanceが付与されません。

## 公開されるファイル

package.jsonの`files`フィールドで指定された内容のみが公開されます:

```json
"files": ["dist"]
```

以下のファイルが含まれます:
- `dist/` - ビルド済みJavaScript、型定義ファイル
  - `dist/bin/cli.js` - CLIエントリーポイント
  - `dist/index.js` / `dist/index.cjs` - ライブラリエントリーポイント
  - `dist/*.d.ts` - TypeScript型定義

自動的に含まれるファイル:
- `package.json`
- `README.md`
- `LICENSE`

## トラブルシューティング

### ワークフローが失敗する

1. **GitHubのActionsタブで詳細ログを確認**
   - Repository → Actions → 失敗したワークフロー → ジョブをクリック

2. **よくあるエラー**

   **エラー**: バージョン不一致
   ```
   ❌ Error: Version mismatch!
      Git tag version: v0.2.0
      package.json version: 0.1.0
   ```
   **原因**: gitタグのバージョンとpackage.jsonのバージョンが一致していない
   **対処法**:
   - package.jsonのversionを確認・更新
   - 正しいバージョンのタグを作成し直す
   - 例: package.jsonが"0.2.0"なら、タグは"v0.2.0"にする

   **エラー**: `npm ERR! code E403`
   ```
   npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@minimalcorp%2fgcpb
   ```
   **原因**: NPM_TOKENが無効、または権限不足
   **対処法**:
   - GitHub Secretsの`NPM_TOKEN`が正しく設定されているか確認
   - トークンに`publish`権限があるか確認
   - @minimalcorp organizationのメンバーであるか確認

   **エラー**: `npm ERR! code E409`
   ```
   npm ERR! 409 Conflict - PUT https://registry.npmjs.org/@minimalcorp%2fgcpb
   ```
   **原因**: 同じバージョンが既に公開済み
   **対処法**: package.jsonのバージョン番号を更新

   **エラー**: テストやlintの失敗
   ```
   Error: Process completed with exit code 1.
   ```
   **原因**: テストまたはlintが失敗
   **対処法**:
   - ローカルで`npm test`と`npm run lint`を実行して修正
   - 修正後、再度タグをpush（古いタグは削除）

### タグの削除と再作成

間違ったタグをpushした場合:

```bash
# ローカルのタグを削除
git tag -d v0.2.0

# リモートのタグを削除
git push origin :refs/tags/v0.2.0

# 正しいタグを作成
git tag v0.2.0
git push origin v0.2.0
```

### Provenanceが表示されない

- GitHub Actionsから公開されていない可能性があります
- ワークフローログで`--provenance`オプションが使用されているか確認
- npm公開ページでProvenanceセクションを確認

## セキュリティのベストプラクティス

1. **トークン管理**
   - NPM_TOKENは絶対にコードにコミットしない
   - 定期的にトークンをローテーション（3-6ヶ月ごと推奨）
   - 不要になったトークンは即座に削除

2. **2要素認証**
   - npmアカウントで2FAを有効化
   - Auth-only（推奨）またはAuth-and-writes

3. **アクセス制限**
   - トークンタイプは`Automation`を使用
   - 必要最小限の権限のみ付与

## バージョン管理のベストプラクティス

### セマンティックバージョニング

`MAJOR.MINOR.PATCH` (例: `1.2.3`)

- **MAJOR**: 破壊的変更（後方互換性なし）
- **MINOR**: 新機能追加（後方互換性あり）
- **PATCH**: バグ修正（後方互換性あり）

### タグとバージョンの対応

- package.json: `"version": "1.2.3"`
- gitタグ: `v1.2.3` (vプレフィックス付き)

### リリースフロー例

```bash
# 1. バージョンアップ（自動でgit commit & tagを作成）
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

# 2. タグをpush（GitHub Actionsがトリガーされる）
git push origin main --follow-tags
```

## 参考リンク

- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Actions - Publishing Node.js packages](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [Semantic Versioning](https://semver.org/)
- [npm Access Tokens](https://docs.npmjs.com/about-access-tokens)
