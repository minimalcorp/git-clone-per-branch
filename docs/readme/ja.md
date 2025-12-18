# gcpb

[![npm version](https://img.shields.io/npm/v/@minimalcorp/gcpb.svg)](https://www.npmjs.com/package/@minimalcorp/gcpb)
[![npm downloads](https://img.shields.io/npm/dm/@minimalcorp/gcpb.svg)](https://www.npmjs.com/package/@minimalcorp/gcpb)
[![CI Status](https://github.com/minimalcorp/git-clone-per-branch/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/minimalcorp/git-clone-per-branch/actions/workflows/ci.yml)
[![Publish Status](https://github.com/minimalcorp/git-clone-per-branch/actions/workflows/publish.yml/badge.svg)](https://github.com/minimalcorp/git-clone-per-branch/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**git worktreeより簡単。開発コンテナでも完璧に動作。**

ブランチごとにgitリポジトリをクローンするCLIツール - git worktreeのシンプルで開発コンテナに優しい代替ツール。

<!-- ![gcpb Demo](docs/images/gcpb-demo.gif) -->

![gcpb インタラクティブモード](../images/gcpb-ss.jpg)

## なぜgcpb？

### git worktreeの問題点

`git worktree`は強力なツールですが、gcpbが解決する重大な課題があります：

1. **❌ 開発コンテナのサポートが不完全** - ワークツリーは開発コンテナで正しく動作しません。GitLensなどのVSCode拡張機能が、開発コンテナ内でワークツリーをgitリポジトリとして認識できません（[GitLens Issue #2818](https://github.com/gitkraken/vscode-gitlens/issues/2818)）

2. **📚 急な学習曲線** - 馴染みのあるgit操作の代わりに、ワークツリー専用のコマンド（`git worktree add`、`git worktree prune`など）を学ぶ必要があります

3. **🔧 手動設定が必要** - アップストリームブランチを手動で設定する必要があり、ワークフローに余分な手順が追加されます

4. **🗑️ メンテナンスのオーバーヘッド** - 古いエントリを削除するために定期的に`git worktree prune`を実行する必要があります

5. **🔗 隠れた依存関係** - すべてのワークツリーが同じ`.git`ディレクトリを共有しており、独立しているように見えるディレクトリ間に見えない繋がりが作られます

6. **⏰ ツールサポートの遅れ** - 多くのツールがワークツリーを完全にサポートしていません。VSCodeでさえ、2025年7月になってようやく完全なワークツリーサポートを追加しました

### gcpbの利点

gcpbは完全に独立したクローンを使用するため：

- ✅ **完璧な開発コンテナ互換性** - すべてのクローンが完全なgitリポジトリです
- ✅ **学習コストゼロ** - 通常の`git clone`と同じように動作します
- ✅ **自動アップストリーム設定** - ブランチが自動的に設定されます
- ✅ **シンプルなクリーンアップ** - ディレクトリを削除するだけです
- ✅ **完全な独立性** - 各クローンが真に独立しています
- ✅ **ユニバーサルなツールサポート** - すべてのgitツールで即座に動作します

### 比較表

| 機能 | git worktree | gcpb |
|------|--------------|------|
| **学習曲線** | ワークツリー専用コマンドを学習 | 馴染みのあるgit操作を使用 |
| **開発コンテナサポート** | ❌ 不完全（GitLens、拡張機能が失敗） | ✅ 完璧な互換性 |
| **メンテナンス** | 手動で`git worktree prune`が必要 | シンプルなディレクトリ削除 |
| **ディレクトリ構造** | メインリポジトリに依存 | 完全に独立したクローン |
| **ツール互換性** | 部分的なサポート、徐々に改善中 | すべてのgitツールで動作 |
| **ユーザーエクスペリエンス** | 特別なコマンド（`git worktree add`） | ファジー検索付きインタラクティブCLI |
| **アップストリーム設定** | 手動設定が必要 | 自動設定 |
| **初心者フレンドリー** | ⚠️ 中級者以上推奨 | ✅ 初心者に最適 |

### 誰が最も恩恵を受けるか？

- 🐳 **開発コンテナユーザー** - gcpbはワークツリーが失敗する場所で完璧に動作します
- 🆕 **Git初心者・中級者** - 特別なコマンドを学ぶ必要がありません
- 🔄 **並行機能開発者** - 複数のブランチで同時に簡単に作業できます
- 👀 **コードレビュアー** - メインの作業に影響を与えずに、素早くPRをクローンしてテストできます

## クイックスタート

3つのシンプルなステップで開始：

```bash
# 1. インストール
npm install -g @minimalcorp/gcpb

# 2. ワークスペースの初期化
cd ~/workspace
gcpb init

# 3. ブランチをクローン（インタラクティブモード）
gcpb
```

これだけです！メニューから「add」を選択すると、gcpbがリポジトリブランチのクローンをガイドします。

<!-- ![Quick Start Demo](docs/images/quick-start.gif) -->

## 機能

- **インタラクティブなコマンド選択** - ファジーフィルタリング付きの検索可能なコマンドメニュー
- **スマートURL検出** - 既存のブランチからリポジトリURLを自動検出
- **整理された構造** - リポジトリを`${owner}/${repo}/${branch}`にクローン
- **複数のコマンド** - ブランチの追加、削除、オープン、管理
- **VSCodeで自動オープン** - クローンしたリポジトリを即座にエディタで開きます
- **コンテキスト対応プロンプト** - 現在のディレクトリに基づいて入力を簡素化
- **HTTPSとSSHに対応** - 両方の認証方式で動作します
- **型安全** - TypeScriptで構築され、信頼性があります

## インストール＆セットアップ

### グローバルインストール（npm）

```bash
npm install -g @minimalcorp/gcpb
```

### 初回セットアップ

希望するワークスペースディレクトリでgcpbを初期化：

```bash
cd ~/workspace  # または好みの場所
gcpb init
```

これにより設定を保存する`.gcpb`ディレクトリが作成されます。

> **💡 推奨**: gcpbは**空のディレクトリ**で初期化することをお勧めします。クリーンなワークスペースから始めることで、適切なディレクトリ構造が確保され、既存ファイルとの競合を回避できます。

### ローカル開発

```bash
# このリポジトリをクローン
git clone https://github.com/minimalcorp/gcpb.git
cd gcpb

# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build

# テスト用にローカルリンク
npm link
```

## 使用方法ガイド

### インタラクティブモード

単に`gcpb`を実行してインタラクティブモードに入ります：

```bash
gcpb
```

検索可能なコマンドメニューが表示されます：
- `add` - 新しいリポジトリブランチをクローン
- `rm` - クローンしたブランチを削除
- `open` - VSCodeでブランチを再度開く
- `Exit` - プログラムを終了

タイプしてコマンドをフィルタリングし、EnterまたはArrowキーで選択します。

### コマンド

#### リポジトリブランチを追加

```bash
gcpb add
```

CLIが以下の手順をガイドします：

1. **リポジトリURL**（owner/repoディレクトリ内の場合は自動検出）
   - 例：`https://github.com/user/repo.git`
   - 例：`git@github.com:user/repo.git`

2. **リモートブランチ名**：チェックアウトするリモートブランチ
   - デフォルト：`main`

3. **ローカルブランチ名**：あなたのローカル作業ブランチ
   - 例：`feat/new-feature`

4. **確認**：ターゲットディレクトリを確認

リポジトリは`.gcpb/${owner}/${repo}/${local-branch}/`にクローンされます

#### ブランチを削除

```bash
gcpb rm
```

インタラクティブリストから削除するブランチを選択します。

#### VSCodeで再度開く

```bash
gcpb open
```

以前にクローンしたブランチを選択してVSCodeで再度開きます。

### 例

```bash
# ワークスペースを初期化
$ cd ~/workspace
$ gcpb init
✔ Initialized .gcpb in /Users/you/workspace

# インタラクティブモードに入る
$ gcpb
? Select a command: › add - Clone a repository branch

# スマートURL検出（.gcpb/facebook/reactディレクトリ内の場合）
$ cd .gcpb/facebook/react
$ gcpb add
Detected context: facebook/react
Found repository URL from "main" branch:
  https://github.com/facebook/react.git

? Use this repository URL? Yes
? Enter the remote branch name: main
? Enter the local branch name: feat/new-hooks

Repository will be cloned to:
  /Users/you/workspace/.gcpb/facebook/react/feat-new-hooks

? Continue? Yes
✔ Prerequisites OK
✔ Repository cloned successfully
✔ Successfully opened in VSCode

╭────────────────────────────────────────────────────────────╮
│                                                            │
│   Repository cloned to:                                   │
│   /Users/you/workspace/.gcpb/facebook/react/feat-new-hooks│
│                                                            │
│   Branch: feat/new-hooks                                  │
│                                                            │
╰────────────────────────────────────────────────────────────╯
```

## ユースケース

### 1. 機能開発ワークフロー

コンフリクトなしで複数の機能を同時に作業：

```bash
# 機能Aの作業を開始
gcpb add
# mainブランチをクローン → feat/authentication

# 切り替えずに機能Bを開始
gcpb add
# mainブランチをクローン → feat/payment-integration

# 両方の機能が独立した環境を持つ
# - 別々の依存関係（node_modules）
# - 別々のgit履歴
# - 必要に応じて別々の開発コンテナ
```

**メリット**：ブランチ切り替え不要、スタッシュ不要、機能間のコンフリクトなし。

### 2. レビュー＆QA環境

作業を中断せずにプルリクエストを素早くテスト：

```bash
# レビュアーがPR #123をテストしたい
gcpb add
# pr/new-api-endpointをクローン → review/pr-123

# 変更をテスト
cd .gcpb/owner/repo/review-pr-123
npm install
npm test

# 完了？削除するだけ
gcpb rm
# 選択：review/pr-123
```

**メリット**：PRを独立してテストし、メイン開発フローを維持。

### 3. 開発コンテナ開発（主要ユースケース）

**これがgcpbが真に輝く場所です。** git worktreeは開発コンテナで壊れますが、gcpbは完璧に動作します：

```bash
# 開発コンテナ作業用にブランチをクローン
gcpb add
# mainをクローン → feat/api-redesign

# 開発コンテナでVSCodeで開く
cd .gcpb/owner/repo/feat-api-redesign
code .

# Open folder in Container（VSCodeコマンド）
# ✅ GitLensが動作
# ✅ Git拡張機能が動作
# ✅ すべてのgit操作が正常に動作
```

**なぜ動作するか**：各gcpbクローンは完全で独立したgitリポジトリです。開発コンテナは完全な`.git`ディレクトリを見るので、すべてのツールが正常に機能します。

**git worktreeで壊れる理由**：開発コンテナは共有された`.git`ディレクトリを見つけられず、以下が発生します：
- GitLensの失敗
- Git履歴が利用できない
- 拡張機能の誤動作
- 悪い開発者体験

<!-- ![Dev Container Comparison](docs/images/dev-container-comparison.png) -->

**参考**：ワークツリー + 開発コンテナ問題の詳細な議論については、[GitLens Issue #2818](https://github.com/gitkraken/vscode-gitlens/issues/2818)を参照してください。

### 4. 並行バージョン開発

異なるバージョンや長期ブランチでの作業：

```bash
# v2.xを開発しながらv1.xを維持
gcpb add
# release/v1.xをクローン → hotfix/security-patch

gcpb add
# mainをクローン → feat/v2-rewrite

# 両方のバージョンで独立して作業
# それぞれが独自の依存関係とビルド成果物を持つ
```

**メリット**：依存関係のコンフリクトなし、明確な関心事の分離。

## 仕組み

### インタラクティブモード
- ファジーフィルタリング付きの検索可能なコマンド選択
- コンテキスト対応コマンド（セットアップ前はinit専用、後は全コマンド）
- Ctrl+Cで優雅に終了

### スマートURL検出
1. gcpb構造内の現在のディレクトリ位置を検出
2. owner/repoディレクトリ内の場合、利用可能なリポジトリをリスト
3. 既存のブランチの`.git`ディレクトリからリモートURLを抽出
4. 検出に失敗した場合、手動URL入力にフォールバック

### クローン処理
1. Git URLを解析してオーナー/組織とリポジトリ名を抽出
2. ディレクトリ構造を作成：`.gcpb/${owner}/${repo}/${branch}`
3. ターゲットディレクトリにリポジトリをクローン
4. 指定されたリモートブランチに基づいてローカルブランチを作成してチェックアウト
   - 同等のコマンド：`git checkout -b ${localBranch} origin/${remoteBranch}`
5. VSCodeでディレクトリを開く（利用可能な場合）

## 要件

- Node.js >= 20.12.0 (Active LTS バージョン 20、22、24を推奨)
- PATHで利用可能なGit
- VSCode（オプション、自動オープン機能用）

### サポートされているNode.jsバージョン

このパッケージは以下のNode.jsバージョンをサポートしています：
- **Node.js 20.x**: >= 20.12.0 (2026年4月までメンテナンスLTS)
- **Node.js 22.x**: 最新版 (2027年4月までメンテナンスLTS)
- **Node.js 24.x**: 最新版 (2028年4月までActive LTS)

最高のエクスペリエンスのために、最新のActive LTSバージョン（Node.js 24）の使用を推奨します。

## 設定

このツールは以下を行います：
- 処理前にGitのインストールを確認
- URLとブランチ名を検証
- 既存のディレクトリの上書きを防止
- 認証エラーを優雅に処理

## FAQ

### Q：gcpbとgit worktreeの主な違いは何ですか？

**A**：コアの違いは独立性と共有です。git worktreeは単一の`.git`リポジトリを共有するリンクされたディレクトリを作成しますが、gcpbは完全に独立したクローンを作成します。これによりgcpbは：
- ✅ 開発コンテナと互換性がある（ワークツリーは非互換）
- ✅ 理解と使用が簡単
- ✅ すべてのgitツールと即座に互換性がある
- ⚠️ より多くのディスク容量を使用（ただし思っているより少ない - 以下参照）

### Q：gcpbはディスク容量を大量に使用しませんか？

**A**：gcpbはワークツリーよりも多くのディスク容量を使用しますが、その差は多くの場合無視できます：

- **Gitオブジェクトは圧縮される**：`.git`ディレクトリは通常、`node_modules`やビルド成果物よりもはるかに小さい
- **最近のSSDは安価**：今日のストレージでは、クローンあたり数百MBはほとんど問題になりません
- **選択的クローン**：積極的に作業しているブランチのみをクローンします
- **簡単なクリーンアップ**：`gcpb rm`で不要なクローンを削除

**例**：典型的なNext.jsプロジェクトは：
- `.git`ディレクトリ：約50MB
- `node_modules`：約500MB
- ビルド成果物：約200MB

リポジトリ自体は総ディスク使用量のわずか7%です。5つの独立したクローンを持つと、git用に約250MB対合計約3.5GBを使用します。

### Q：git worktreeからgcpbに移行できますか？

**A**：はい！方法は以下の通りです：

1. **現在のワークツリーをリスト**：`git worktree list`
2. **各ワークツリーについて**、ブランチ名をメモ
3. **gcpbを使用して各ブランチをクローン**：各ブランチについて`gcpb add`
4. **古いワークツリーを削除**：`git worktree remove <path>`
5. **クリーンアップ**：`git worktree prune`

段階的に移行できます - gcpbとワークツリーは移行中に共存できます。

### Q：gcpbはモノレポで動作しますか？

**A**：はい！gcpbはモノレポで完璧に動作します。各クローンが完全なリポジトリなので、すべてのモノレポツール（Nx、Turborepo、Lerna）が正常に動作します。以下が可能です：
- モノレポの異なるブランチを同時に実行
- 異なるブランチ間で変更をテスト
- モノレポで開発コンテナを使用（ワークツリーでは問題がある）

### Q：gcpbはWindows/Mac/Linuxで動作しますか？

**A**：はい、gcpbはクロスプラットフォームで以下で動作します：
- ✅ **macOS**（IntelとApple Silicon）
- ✅ **Linux**（すべてのディストリビューション）
- ✅ **Windows**（Windows 10/11、WSL2）

要件：
- Node.js 18+（クロスプラットフォーム）
- Git（クロスプラットフォーム）
- VSCode（オプション、クロスプラットフォーム）

### Q：VSCodeなしでgcpbを使用できますか？

**A**：もちろんです！自動オープン機能はオプションです。gcpbはコマンドラインから完璧に動作します。単に：
- `gcpb add`を使用してブランチをクローン
- `cd .gcpb/owner/repo/branch`でナビゲート
- 好みのエディタを使用（vim、emacs、IntelliJなど）

`gcpb open`コマンドはVSCodeがインストールされている場合のみ動作しますが、他のすべての機能はどのエディタでも動作します。

## 開発

### 開発環境

このプロジェクトは開発にNode.js 24.12.0を使用しています。バージョンは以下を通じて固定されています：
- `.node-version` ファイル (nvm、fnm、nodenv、asdf用)
- Docker開発コンテナ (`.devcontainer/Dockerfile`)

正しいバージョンを使用していることを確認するには：

```bash
# nvmの場合
nvm use

# fnmの場合
fnm use

# または手動で確認
node --version  # v24.12.0 を出力するはずです
```

### 開発コマンド

```bash
# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build

# 開発モードで実行（watch）
npm run dev

# リンターを実行
npm run lint

# リンティング問題を修正
npm run lint:fix

# コードをフォーマット
npm run format

# フォーマットをチェック
npm run format:check

# テストを実行
npm test
```

## コントリビューション

コントリビューションは歓迎です！プルリクエストを自由に送信してください。

大きな変更の場合は、まずイシューを開いて変更したい内容を議論してください。

## ライセンス

MIT
