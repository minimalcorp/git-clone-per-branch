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
  id-token: write # OIDC認証用（必須）
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
5. **GitHub Release作成（自動生成されたChangelog付き）**
6. npmに公開（OIDC認証、Provenance付与）

公開状況はGitHubの**Actions**タブで確認できます。

**GitHub Releases**:
- リリースページ: https://github.com/minimalcorp/git-clone-per-branch/releases
- Changelogは前のタグから今のタグまでのコミットから自動生成されます
- Conventional Commits形式（feat:, fix:など）に基づいて整理されます

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

### GitHub Release が作成されない場合

**原因**:
1. Permissions が `contents: read` のまま
2. `fetch-depth: 0` が設定されていない
3. ネットワークエラー

**確認方法**:
```bash
# GitHub Actions のログを確認
# https://github.com/minimalcorp/git-clone-per-branch/actions

# エラーメッセージで原因を特定
# - "Resource not accessible by integration" → Permissions エラー
# - "could not determine previous tag" → fetch-depth エラー
```

**対処法**:
1. `.github/workflows/publish.yml` の permissions を確認
2. checkout ステップに `fetch-depth: 0` があるか確認
3. 問題修正後、タグを削除して再 push

---

## リリースのロールバック

リリース中に問題が発生した場合のロールバック手順です。

### シナリオ1: GitHub Actions でビルドが失敗した場合

**状況**: タグは push されたが、workflow がビルドエラーで失敗

**対処法**:
1. ローカルでビルドエラーを修正
2. 同じバージョンで再リリース（タグを削除して再作成）

```bash
# ローカルのタグを削除
git tag -d v0.2.0

# リモートのタグを削除
git push origin :refs/tags/v0.2.0

# エラーを修正してコミット
git add .
git commit -m "fix: resolve build error"

# 再度タグを作成
npm version patch  # または手動で git tag v0.2.0

# 再度 push
git push origin main --follow-tags
```

**結果**: GitHub Actions が再実行され、正しくビルド → Release 作成 → npm publish

---

### シナリオ2: npm publish は成功したが、リリースに問題があった場合

**状況**: パッケージが npm に公開されたが、重大なバグが見つかった

**対処法**:
1. **非推奨マーク** (軽微な問題の場合):
   ```bash
   npm deprecate @minimalcorp/gcpb@0.2.0 "This version has a critical bug. Please upgrade to 0.2.1."
   ```

2. **即座にパッチリリース** (推奨):
   ```bash
   # バグを修正
   git add .
   git commit -m "fix: critical bug in version 0.2.0"

   # パッチバージョンを作成
   npm version patch  # 0.2.0 → 0.2.1

   # push してリリース
   git push origin main --follow-tags
   ```

3. **パッケージの削除** (最終手段、公開後72時間以内のみ):
   ```bash
   # 特定のバージョンを削除
   npm unpublish @minimalcorp/gcpb@0.2.0

   # 警告: unpublish は24時間以内に再公開不可
   # 可能な限り deprecate + パッチリリースを推奨
   ```

**注意**:
- npm unpublish は公開後 72 時間以内のみ可能
- unpublish したバージョンは 24 時間再公開できない
- 可能な限り deprecate + パッチリリースを推奨

---

### シナリオ3: GitHub Release のみ削除したい場合

**状況**: npm パッケージは問題ないが、GitHub Release のみ削除したい

**対処法**:
```bash
# GitHub Release を削除（タグは残る）
gh release delete v0.2.0

# または GitHub UI から削除
# 1. https://github.com/minimalcorp/git-clone-per-branch/releases へ移動
# 2. 対象の Release の "Edit" をクリック
# 3. 最下部の "Delete this release" をクリック
```

**注意**: Release を削除してもタグは残ります。タグも削除する場合は:
```bash
git push origin :refs/tags/v0.2.0
```

---

### シナリオ4: 完全にリリースをなかったことにする

**状況**: テスト目的で公開したバージョンを完全に削除したい

**対処法**:
```bash
# 1. npm から削除（72時間以内のみ）
npm unpublish @minimalcorp/gcpb@0.2.0

# 2. GitHub Release を削除
gh release delete v0.2.0
# または GitHub UI から削除

# 3. リモートのタグを削除
git push origin :refs/tags/v0.2.0

# 4. ローカルのタグを削除
git tag -d v0.2.0
```

**警告**:
- npm unpublish は公開後 72 時間以内のみ可能
- unpublish したバージョンは 24 時間再公開できない
- 本番リリースでは使用を避けること

---

### ロールバックのベストプラクティス

1. **問題発見時**:
   - 軽微な問題 → deprecate + パッチリリース（推奨）
   - 重大な問題 → 即座にパッチリリース
   - テスト版の削除 → 完全削除（72時間以内のみ）

2. **予防策**:
   - リリース前に十分なテストを実施
   - 小さな変更を頻繁にリリース（問題の範囲を限定）
   - セマンティックバージョニングを遵守

3. **緊急時の連絡**:
   - GitHub Issues で問題を報告
   - README に警告を追加（次のパッチまでの暫定対応）

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
