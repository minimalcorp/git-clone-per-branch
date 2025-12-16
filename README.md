# gcpb

CLI tool for cloning git repository per branch - alternative to git worktree

## Features

- Clone repositories into an organized directory structure: `${owner}/${repo}/${branch}`
- Interactive prompts for easy configuration
- Automatically create new branches based on a base branch
- Auto-open cloned repository in VSCode
- Support for both HTTPS and SSH URLs
- Built with TypeScript for type safety

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

Simply run the command:

```bash
gcpb
```

The CLI will guide you through:

1. **Git repository URL**: Enter the clone URL (HTTPS or SSH)
   - Example: `https://github.com/user/repo.git`
   - Example: `git@github.com:user/repo.git`

2. **Base branch name**: The branch to base your new branch on
   - Default: `main`
   - Can use remote references: `origin/main`

3. **Target branch name**: The name of your new branch
   - Example: `feat/new-feature`

4. **Confirmation**: Review the target directory and confirm

The repository will be cloned to:
```
./${owner}/${repo}/${target-branch}/
```

For example:
```
./facebook/react/feat-new-hooks/
```

## Example

```bash
$ gcpb
? Enter the Git repository URL: https://github.com/facebook/react.git
? Enter the base branch name: main
? Enter the new branch name: feat/new-hooks

Repository will be cloned to:
  /Users/you/projects/facebook/react/feat-new-hooks

? Continue? Yes
✔ Prerequisites OK
✔ Repository cloned successfully
✔ Successfully opened in VSCode

╭─────────────────────────────────────────────────────╮
│                                                     │
│   Repository cloned to:                            │
│   /Users/you/projects/facebook/react/feat-new-hooks│
│                                                     │
│   Branch: feat/new-hooks                           │
│                                                     │
╰─────────────────────────────────────────────────────╯
```

## How it Works

1. Parses the Git URL to extract owner/organization and repository name
2. Creates the directory structure: `${cwd}/${owner}/${repo}/${branch}`
3. Clones the repository to the target directory
4. Creates and checks out a new branch based on the specified base branch
   - Equivalent to: `git checkout -b ${targetBranch} ${baseBranch}`
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
