# NPM公開手順ガイド

このドキュメントでは、`@minimalcorp/gcpb`パッケージをnpmに公開するための手順を説明します。

## 初回公開手順

パッケージを初めてnpmに公開する場合は、以下の4ステップで行います。

### ステップ1: ローカルから初回公開

パッケージを初めて公開する際は、ローカル環境から手動で公開する必要があります。

1. **npmにログイン**
   ```bash
   npm login
   ```

   ブラウザが開き、npmアカウントで認証します（Touch ID/Passkey可）。

2. **ビルド**
   ```bash
   npm run build
   ```

3. **公開**
   ```bash
   npm publish --access public
   ```

   **重要**:
   - `--access public` は**必須**です
   - スコープ付きパッケージ（`@minimalcorp/gcpb`）はデフォルトでprivateのため、明示的にpublicを指定する必要があります
   - 2要素認証（2FA）が有効な場合、OTPが必要です:
     ```bash
     npm publish --access public --otp=123456
     ```
     （認証アプリから6桁のコードを取得してください）

4. **公開の確認**
   - https://www.npmjs.com/package/@minimalcorp/gcpb にアクセス
   - パッケージが表示されることを確認

### ステップ2: Trusted Publisherの設定

初回公開後、GitHub Actionsからの自動公開を有効にするため、Trusted Publisherを設定します。

1. [npmjs.com](https://www.npmjs.com/)にログイン
2. パッケージページ（https://www.npmjs.com/package/@minimalcorp/gcpb）へ移動
3. **Settings** タブをクリック
4. **Trusted Publishers** セクションを見つける
5. **GitHub Actions** ボタンをクリック
6. 以下の情報を入力:
   - **Organization/User**: `minimalcorp`
   - **Repository**: `git-clone-per-branch`
   - **Workflow filename**: `publish.yml`
   - **Environment**: (空欄でOK、または`production`など)
7. **Add** をクリック

これで、指定したGitHub Actionsワークフローから、トークンなしでパッケージを公開できるようになります。

### ステップ3: ワークフローファイルの確認

`.github/workflows/publish.yml`が以下の設定になっていることを確認してください:

```yaml
permissions:
  id-token: write  # OIDC認証用（必須）
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          registry-url: 'https://registry.npmjs.org'

      - name: Publish to npm
        run: npm publish --provenance --access public
        # NPM_TOKEN不要 - Trusted Publishing (OIDC)を使用
```

**重要**: `NODE_AUTH_TOKEN`環境変数やシークレットは**不要**です。

### ステップ4: 2回目以降の公開（自動化）

Trusted Publisher設定後は、gitタグをpushするだけで自動的にnpmに公開されます。

```bash
# 1. バージョンアップ（自動でコミット & タグ作成）
npm version patch  # 0.1.0 → 0.1.1
# または
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

# 2. タグをpush（GitHub Actionsが自動実行される）
git push origin main --follow-tags
```

GitHub Actionsが自動的に:
1. テスト実行（`npm test`）
2. Lint実行（`npm run lint`）
3. バージョンチェック（タグとpackage.jsonの一致確認）
4. ビルド（`npm run build`）
5. npmに公開（OIDC認証、Provenance付与）

公開状況はGitHubの**Actions**タブで確認できます。

---

## 公開されるファイル

package.jsonの`files`フィールドで指定された内容のみが公開されます:

```json
"files": ["dist"]
```

### 含まれるファイル:
- `dist/` - ビルド済みJavaScript、型定義ファイル
  - `dist/bin/cli.js` - CLIエントリーポイント
  - `dist/index.js` / `dist/index.cjs` - ライブラリエントリーポイント
  - `dist/*.d.ts` - TypeScript型定義

### 自動的に含まれるファイル:
- `package.json`
- `README.md`
- `LICENSE`

### 除外されるファイル（.npmignoreで設定）:
- ソースファイル (`src/`, `tests/`)
- 設定ファイル (`tsconfig.json`, `eslint.config.js`など)
- 開発用ファイル (`.github/`, ログファイルなど)

---

## トラブルシューティング

### 初回公開時のエラー

#### エラー: OTPが必要
```
npm error code EOTP
npm error This operation requires a one-time password
```

**原因**: 2要素認証（2FA）が有効
**対処法**:
1. npmアカウントでAuthenticator App（TOTP）を設定
2. 認証アプリから6桁のコードを取得
3. `npm publish --access public --otp=123456` で公開

**Touch IDのみの場合**:
- Touch ID/PasskeyはWebブラウザ用で、CLI公開には使えません
- npmの設定でAuthenticator Appを追加してください
- https://www.npmjs.com/settings/[username]/tfa

#### エラー: アクセス権限エラー
```
npm ERR! code E403
npm ERR! 403 Forbidden
```

**原因**: @minimalcorp organizationのメンバーでないか、権限不足
**対処法**:
- organizationのメンバーであることを確認: `npm org ls minimalcorp`
- Developer以上の権限が必要

#### エラー: パッケージ名が既に使用されている
```
npm ERR! code E409
npm ERR! 409 Conflict
```

**原因**: 同じバージョンが既に公開済み
**対処法**: package.jsonのバージョンを更新

### GitHub Actionsでのエラー

#### エラー: バージョン不一致
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

#### エラー: Trusted Publishing認証エラー
```
npm ERR! code EUNAUTHENTICATED
npm ERR! Unable to authenticate
```

**原因**: Trusted Publisherの設定が正しくない
**対処法**:
- npmjs.comのTrusted Publisher設定を確認
- Workflow filename が正確か確認（`.yml`拡張子まで含む）
- Repository名、Organization名が正確か確認（大文字小文字区別あり）
- ワークフローに`id-token: write`パーミッションがあるか確認

#### エラー: テストやlintの失敗
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

---

## セマンティックバージョニング

`MAJOR.MINOR.PATCH` (例: `1.2.3`)

- **MAJOR**: 破壊的変更（後方互換性なし）
- **MINOR**: 新機能追加（後方互換性あり）
- **PATCH**: バグ修正（後方互換性あり）

### npm versionコマンド

```bash
# パッチバージョンアップ（バグ修正）
npm version patch  # 0.1.0 → 0.1.1

# マイナーバージョンアップ（新機能）
npm version minor  # 0.1.0 → 0.2.0

# メジャーバージョンアップ（破壊的変更）
npm version major  # 0.1.0 → 1.0.0
```

このコマンドは自動的に:
1. package.jsonとpackage-lock.jsonのバージョンを更新
2. git commitを作成
3. git tagを作成（v0.2.0のような形式）

### タグとバージョンの対応

- package.json: `"version": "1.2.3"`
- gitタグ: `v1.2.3` (vプレフィックス付き)

ワークフローで自動的に整合性チェックが行われます。

---

## セキュリティのベストプラクティス

### Trusted Publishing使用時

✅ **推奨事項**:
- Trusted Publisherの設定を定期的に確認
- Workflow filenameを厳密に管理
- 不要なworkflowは削除

✅ **安全性**:
- トークンが存在しないため漏洩リスクゼロ
- 短命なOIDCトークン（ワークフロー実行時のみ有効）
- Provenanceで出所証明が可能

### Access Token使用時（非推奨）

⚠️ **必須事項**:
- トークンは絶対にコードにコミットしない
- GitHub Secretsに安全に保管
- 定期的にトークンをローテーション（3-6ヶ月ごと）
- 不要になったトークンは即座に削除

⚠️ **2要素認証**:
- npmアカウントで2FAを有効化
- Auth-only（推奨）またはAuth-and-writes

⚠️ **アクセス制限**:
- トークンタイプは`Automation`を使用
- 必要最小限の権限のみ付与

---

## 参考リンク

- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [GitHub Actions - Publishing Node.js packages](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [Semantic Versioning](https://semver.org/)
- [npm Access Tokens](https://docs.npmjs.com/about-access-tokens)
