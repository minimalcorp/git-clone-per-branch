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

### リリース失敗時の診断

GitHub Actions のログを確認: https://github.com/minimalcorp/git-clone-per-branch/actions

**よくあるエラーと対処法**:

- ビルドエラー → 下記「シナリオ1」参照
- `Resource not accessible by integration` → publish.yml の permissions を `contents: write` に変更
- `could not determine previous tag` → checkout ステップに `fetch-depth: 0` を追加

---

## リリースのロールバック

### シナリオ1: タグ push 後にビルドが失敗

**状況**: タグを push したが GitHub Actions がエラーで失敗した

**対処法**:

```bash
# 1. タグを削除（ローカル + リモート）
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# 2. エラーを修正してコミット
git add .
git commit -m "fix: resolve build error"

# 3. タグを再作成して push
npm version patch  # または手動で git tag v0.2.0
git push origin main --follow-tags
```

---

### シナリオ2: リリース後に重大なバグを発見

**状況**: npm に公開されたが問題が見つかった

**対処法（優先順）**:

1. **パッチリリース（推奨）**:

   ```bash
   git add .
   git commit -m "fix: critical bug"
   npm version patch
   git push origin main --follow-tags
   ```

2. **非推奨マーク（軽微な問題）**:

   ```bash
   npm deprecate @minimalcorp/gcpb@0.2.0 "Please upgrade to 0.2.1"
   ```

3. **削除（最終手段、72時間以内のみ）**:
   ```bash
   npm unpublish @minimalcorp/gcpb@0.2.0
   ```
   ⚠️ 削除後24時間は再公開不可

---

### シナリオ3: GitHub Release を削除

**Release のみ削除**:

```bash
gh release delete v0.2.0
# または GitHub UI: Releases → Edit → Delete this release
```

**Release + タグを削除**:

```bash
gh release delete v0.2.0
git push origin :refs/tags/v0.2.0
git tag -d v0.2.0
```

---

### シナリオ4: テストリリースを完全削除（72時間以内のみ）

```bash
npm unpublish @minimalcorp/gcpb@0.2.0  # 1. npm から削除
gh release delete v0.2.0                # 2. Release 削除
git push origin :refs/tags/v0.2.0       # 3. リモートタグ削除
git tag -d v0.2.0                       # 4. ローカルタグ削除
```

⚠️ 本番リリースには使用せず、パッチリリースを推奨

---

### ベストプラクティス

- 軽微な問題 → deprecate + パッチリリース
- 重大な問題 → 即座にパッチリリース
- テスト版 → 完全削除（72時間以内のみ）

**予防策**: リリース前のテスト、小さく頻繁なリリース、セマンティックバージョニングの遵守

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
