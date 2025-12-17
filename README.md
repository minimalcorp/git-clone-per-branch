# gcpb

CLI tool for cloning git repository per branch - alternative to git worktree

## Features

- **Interactive command selection** - Searchable command menu with fuzzy filtering
- **Smart URL detection** - Automatically detects repository URLs from existing branches
- **Organized structure** - Clone repositories into `${owner}/${repo}/${branch}`
- **Multiple commands** - Add, remove, open, and manage cloned branches
- **Auto-open in VSCode** - Instantly open cloned repositories in your editor
- **Context-aware prompts** - Simplified input based on current directory
- **Support for HTTPS and SSH** - Works with both authentication methods
- **Type-safe** - Built with TypeScript for reliability

## Installation

### Global Installation (npm)

```bash
npm install -g @minimalcorp/gcpb
```

### Local Development

```bash
# Clone this repository
git clone https://github.com/minimalcorp/gcpb.git
cd gcpb

# Install dependencies
npm install

# Build the project
npm run build

# Link locally for testing
npm link
```

## Usage

### First Time Setup

Initialize gcpb in your desired workspace directory:

```bash
cd ~/workspace  # or your preferred location
gcpb init
```

This creates a `.gcpb` directory to store configuration.

### Interactive Mode

Simply run `gcpb` to enter interactive mode:

```bash
gcpb
```

You'll see a searchable command menu:
- `add` - Clone a new repository branch
- `rm` - Remove cloned branches
- `open` - Reopen a branch in VSCode
- `Exit` - Exit the program

Type to filter commands, then select with Enter or arrow keys.

### Commands

#### Add a Repository Branch

```bash
gcpb add
```

The CLI will guide you through:

1. **Repository URL** (auto-detected if in owner/repo directory)
   - Example: `https://github.com/user/repo.git`
   - Example: `git@github.com:user/repo.git`

2. **Remote branch name**: The remote branch to checkout from
   - Default: `main`

3. **Local branch name**: Your local working branch
   - Example: `feat/new-feature`

4. **Confirmation**: Review the target directory

Repositories are cloned to: `.gcpb/${owner}/${repo}/${local-branch}/`

#### Remove Branches

```bash
gcpb rm
```

Select branches to remove from an interactive list.

#### Reopen in VSCode

```bash
gcpb open
```

Select a previously cloned branch to reopen in VSCode.

## Example

```bash
# Initialize workspace
$ cd ~/workspace
$ gcpb init
✔ Initialized .gcpb in /Users/you/workspace

# Enter interactive mode
$ gcpb
? Select a command: › add - Clone a repository branch

# Smart URL detection (when in .gcpb/facebook/react directory)
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

## How it Works

### Interactive Mode
- Searchable command selection with fuzzy filtering
- Context-aware commands (init-only before setup, full commands after)
- Graceful exit with Ctrl+C

### Smart URL Detection
1. Detects current directory location in gcpb structure
2. If in owner/repo directory, lists available repositories
3. Extracts remote URL from existing branch `.git` directories
4. Falls back to manual URL input if detection fails

### Cloning Process
1. Parses the Git URL to extract owner/organization and repository name
2. Creates the directory structure: `.gcpb/${owner}/${repo}/${branch}`
3. Clones the repository to the target directory
4. Creates and checks out a local branch based on the specified remote branch
   - Equivalent to: `git checkout -b ${localBranch} origin/${remoteBranch}`
5. Opens the directory in VSCode (if available)

## Why Use This?

### vs Git Worktree

- **Simpler**: No need to manage worktrees, just clone and go
- **Clearer**: Each branch is a completely separate directory
- **Flexible**: Works with any repository, no existing repo needed
- **Familiar**: Uses standard git clone, no worktree-specific commands

### vs Manual Cloning

- **Organized**: Automatic directory structure keeps projects tidy
- **Faster**: Interactive prompts reduce typing and mistakes
- **Automated**: Auto-creates branches and opens in VSCode

## Requirements

- Node.js >= 18.0.0
- Git installed and available in PATH
- VSCode (optional, for auto-open feature)

## Configuration

The tool will:
- Check for Git installation before proceeding
- Validate URLs and branch names
- Prevent overwriting existing directories
- Handle authentication errors gracefully

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode (watch)
npm run dev

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Run tests
npm test
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
