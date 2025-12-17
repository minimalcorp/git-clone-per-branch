import { Command } from 'commander';
import { search } from '@inquirer/prompts';
import { promptForCloneConfigWithContext } from '../prompts/interactive.js';
import { promptForOrg, promptForRepo, promptForBranches } from '../prompts/remove.js';
import { promptForOrg as promptForOrgOpen, promptForRepo as promptForRepoOpen, promptForBranch } from '../prompts/open.js';
import { cloneRepository } from '../core/clone.js';
import { openInVSCode } from '../core/vscode.js';
import { Logger } from '../utils/logger.js';
import { handleError } from '../utils/error-handler.js';
import { checkGitInstalled, sanitizeBranchName } from '../utils/validators.js';
import { findRoot, initializeConfig, cleanupEmptyDirectories } from '../core/config.js';
import { scanRepositories } from '../core/repository-scanner.js';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import type { RemovalSelection } from '../types/index.js';

const logger = new Logger();

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

const program = new Command();

program
  .name('gcpb')
  .description('Clone git repository per branch - alternative to git worktree')
  .version(packageJson.version);

// Helper function to check if error is a user cancellation
function isCancellationError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('User force closed') ||
      error.message.includes('canceled') ||
      error.message.includes('cancelled') ||
      error.name === 'ExitPromptError'
    );
  }
  return false;
}

// init command
program
  .command('init')
  .description('Initialize .gcpb configuration in current directory')
  .action(async () => {
    try {
      // 1. Check if .gcpb already exists
      const existingRoot = await findRoot();
      if (existingRoot) {
        logger.error('.gcpb configuration already exists');
        logger.info(`Found at: ${existingRoot}`);
        process.exit(1);
      }

      // 2. Initialize configuration
      const rootDir = await initializeConfig(process.cwd());

      // 3. Success message
      logger.box(
        `Initialized gcpb\n\nRoot directory: ${rootDir}\n\nYou can now use "gcpb add" to clone repositories.`,
        'success'
      );
    } catch (error) {
      if (isCancellationError(error)) {
        console.log('');
        logger.info('Goodbye!');
        process.exit(0);
      }
      handleError(error, logger);
      process.exit(1);
    }
  });

// add command
program
  .command('add')
  .description('Clone a repository branch')
  .action(async () => {
    try {
      // 1. Check git is installed
      logger.startSpinner('Checking prerequisites...');
      const gitCheck = checkGitInstalled();
      if (!gitCheck.valid) {
        logger.stopSpinner(false, 'Git not found');
        logger.error(gitCheck.error || 'Git is not installed');
        process.exit(1);
      }
      logger.stopSpinner(true, 'Prerequisites OK');

      // 2. Find root directory
      const rootDir = await findRoot();
      if (!rootDir) {
        logger.error('No .gcpb configuration found');
        logger.info('Run "gcpb init" to initialize');
        process.exit(1);
      }

      logger.info(`Root directory: ${rootDir}`);

      // 3. Prompt for configuration
      const config = await promptForCloneConfigWithContext(rootDir);

      // 4. Clone repository
      logger.startSpinner('Cloning repository...');
      const result = await cloneRepository({
        ...config,
        rootDir,
      });

      if (!result.success) {
        logger.stopSpinner(false, 'Clone failed');
        if (result.error) {
          throw result.error;
        }
        throw new Error('Clone failed with unknown error');
      }
      logger.stopSpinner(true, 'Repository cloned successfully');

      // 5. Open in VSCode
      logger.info('Opening in VSCode...');
      const opened = await openInVSCode({ targetPath: result.targetPath });

      if (opened) {
        logger.success('Successfully opened in VSCode');
      } else {
        logger.warn('VSCode not available. Please open manually:');
        logger.info(`  cd ${result.targetPath}`);
      }

      // 6. Show success message
      logger.box(
        `Repository cloned to:\n${result.targetPath}\n\nBranch: ${config.targetBranch}`,
        'success'
      );
    } catch (error) {
      if (isCancellationError(error)) {
        console.log('');
        logger.info('Goodbye!');
        process.exit(0);
      }
      handleError(error, logger);
      process.exit(1);
    }
  });

// rm command
program
  .command('rm [path]')
  .description('Remove cloned repositories')
  .option('-f, --force', 'Remove without confirmation')
  .action(async (targetPath?: string, options?: { force?: boolean }) => {
    try {
      // 1. Find root directory
      const rootDir = await findRoot();
      if (!rootDir) {
        logger.error('No .gcpb configuration found');
        logger.info('Run "gcpb init" to initialize');
        process.exit(1);
      }

      // 2. Scan repositories
      logger.startSpinner('Scanning repositories...');
      const repositories = await scanRepositories(rootDir);
      logger.stopSpinner(true, 'Scan complete');

      if (repositories.length === 0) {
        logger.warn('No repositories found');
        logger.info('Use "gcpb add" to clone repositories');
        process.exit(0);
      }

      // 3. Parse path argument
      // Handle branch names with slashes (e.g., org/repo/feat/xxx)
      const pathParts = targetPath ? targetPath.split('/') : [];
      const [org, repo, ...branchParts] = pathParts;
      // Join remaining parts and sanitize to match directory structure
      const branch = branchParts.length > 0 ? sanitizeBranchName(branchParts.join('/')) : undefined;

      // 4. Hierarchical selection
      let selectedOrg = org;
      let selectedRepo = repo;
      let selectedBranches: string[] = [];

      // Select org if not provided
      if (!selectedOrg) {
        selectedOrg = await promptForOrg(repositories);
      }

      // Filter repos by org
      const orgRepos = repositories.filter((r) => r.owner === selectedOrg);
      if (orgRepos.length === 0) {
        logger.error(`No repositories found for organization: ${selectedOrg}`);
        process.exit(1);
      }

      // Select repo if not provided
      if (!selectedRepo) {
        selectedRepo = await promptForRepo(orgRepos);
      }

      // Find target repo
      const targetRepoInfo = orgRepos.find((r) => r.repo === selectedRepo);
      if (!targetRepoInfo) {
        logger.error(`Repository not found: ${selectedOrg}/${selectedRepo}`);
        process.exit(1);
      }

      // Select branches
      if (!branch) {
        // Prompt for branches (multi-select)
        selectedBranches = await promptForBranches(targetRepoInfo.branches);
      } else {
        // Use specified branch
        if (!targetRepoInfo.branches.includes(branch)) {
          logger.error(`Branch not found: ${selectedOrg}/${selectedRepo}/${branch}`);
          process.exit(1);
        }
        selectedBranches = [branch];
      }

      // 5. Build removal list
      const itemsToRemove: RemovalSelection[] = selectedBranches.map((b) => ({
        path: path.join(rootDir, selectedOrg, selectedRepo, sanitizeBranchName(b)),
        label: `${selectedOrg}/${selectedRepo}/${b}`, // Display with original branch name
      }));

      // 6. Confirm deletion (unless --force)
      if (!options?.force) {
        console.log('');
        console.log('The following will be removed:');
        itemsToRemove.forEach((item) => {
          logger.warn(`  ${item.label}`);
        });
        console.log('');

        interface ConfirmAnswer {
          confirm: boolean;
        }

        const { confirm } = await inquirer.prompt<ConfirmAnswer>([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Continue with removal?',
            default: false,
          },
        ]);

        if (!confirm) {
          logger.info('Cancelled');
          process.exit(0);
        }
      }

      // 7. Remove directories
      logger.startSpinner('Removing repositories...');
      for (const item of itemsToRemove) {
        await fs.remove(item.path);
      }
      logger.stopSpinner(true, 'Removal complete');

      // 8. Cleanup empty directories
      await cleanupEmptyDirectories(rootDir);

      // 9. Success message
      logger.success(`Removed ${itemsToRemove.length} branch(es)`);
    } catch (error) {
      if (isCancellationError(error)) {
        console.log('');
        logger.info('Goodbye!');
        process.exit(0);
      }
      handleError(error, logger);
      process.exit(1);
    }
  });

// open command
program
  .command('open [path]')
  .description('Open a cloned repository branch in VSCode')
  .action(async (targetPath?: string) => {
    try {
      // 1. Find root directory
      const rootDir = await findRoot();
      if (!rootDir) {
        logger.error('No .gcpb configuration found');
        logger.info('Run "gcpb init" to initialize');
        process.exit(1);
      }

      // 2. Scan repositories
      logger.startSpinner('Scanning repositories...');
      const repositories = await scanRepositories(rootDir);
      logger.stopSpinner(true, 'Scan complete');

      if (repositories.length === 0) {
        logger.warn('No repositories found');
        logger.info('Use "gcpb add" to clone repositories');
        process.exit(0);
      }

      // 3. Parse path argument (org/repo/branch)
      const pathParts = targetPath ? targetPath.split('/') : [];
      const [org, repo, ...branchParts] = pathParts;
      const branch = branchParts.length > 0 ? sanitizeBranchName(branchParts.join('/')) : undefined;

      // 4. Hierarchical selection
      let selectedOrg = org;
      let selectedRepo = repo;
      let selectedBranch: string;

      // Select org if not provided
      if (!selectedOrg) {
        selectedOrg = await promptForOrgOpen(repositories);
      }

      // Filter repos by org
      const orgRepos = repositories.filter((r) => r.owner === selectedOrg);
      if (orgRepos.length === 0) {
        logger.error(`No repositories found for organization: ${selectedOrg}`);
        process.exit(1);
      }

      // Select repo if not provided
      if (!selectedRepo) {
        selectedRepo = await promptForRepoOpen(orgRepos);
      }

      // Find target repo
      const targetRepoInfo = orgRepos.find((r) => r.repo === selectedRepo);
      if (!targetRepoInfo) {
        logger.error(`Repository not found: ${selectedOrg}/${selectedRepo}`);
        process.exit(1);
      }

      // Select branch (single-select)
      if (!branch) {
        selectedBranch = await promptForBranch(targetRepoInfo.branches);
      } else {
        if (!targetRepoInfo.branches.includes(branch)) {
          logger.error(`Branch not found: ${selectedOrg}/${selectedRepo}/${branch}`);
          process.exit(1);
        }
        selectedBranch = branch;
      }

      // 5. Construct target path
      const branchPath = path.join(rootDir, selectedOrg, selectedRepo, selectedBranch);

      // 6. Verify directory exists
      const exists = await fs.pathExists(branchPath);
      if (!exists) {
        logger.error(`Branch directory not found: ${branchPath}`);
        process.exit(1);
      }

      // 7. Open in VSCode
      logger.info(`Opening ${selectedOrg}/${selectedRepo}/${selectedBranch}...`);
      const opened = await openInVSCode({ targetPath: branchPath });

      if (opened) {
        logger.success('Successfully opened in VSCode');
        logger.box(
          `Opened in VSCode:\n${selectedOrg}/${selectedRepo}/${selectedBranch}\n\nPath: ${branchPath}`,
          'success'
        );
      } else {
        logger.warn('VSCode not available. Please open manually:');
        logger.info(`  cd ${branchPath}`);
      }
    } catch (error) {
      if (isCancellationError(error)) {
        console.log('');
        logger.info('Goodbye!');
        process.exit(0);
      }
      handleError(error, logger);
      process.exit(1);
    }
  });

/**
 * Interactive mode - runs when gcpb is called without arguments
 */
async function runInteractiveMode(): Promise<void> {
  try {
    // Check if .gcpb exists
    const rootDir = await findRoot();
    const hasConfig = !!rootDir;

    // Define available commands based on config existence
    interface CommandOption {
      name: string;
      value: string;
      description: string;
    }

    const commands: CommandOption[] = hasConfig
      ? [
          { name: 'add - Clone a repository branch', value: 'add', description: 'Clone a new branch' },
          { name: 'rm - Remove cloned branches', value: 'rm', description: 'Remove existing branches' },
          { name: 'open - Open a branch in VSCode', value: 'open', description: 'Open branch in editor' },
          { name: 'Exit', value: 'exit', description: 'Exit interactive mode' },
        ]
      : [
          { name: 'init - Initialize .gcpb configuration', value: 'init', description: 'Setup gcpb' },
          { name: 'Exit', value: 'exit', description: 'Exit interactive mode' },
        ];

    // Show interactive prompt
    let command: string;
    try {
      command = await search({
        message: hasConfig ? 'Select a command:' : 'Initialize gcpb first:',
        source: async (term) => {
          const searchTerm = (term || '').toLowerCase();
          return Promise.resolve(
            commands
              .filter((cmd) => cmd.name.toLowerCase().includes(searchTerm) || cmd.value.includes(searchTerm))
              .map((cmd) => ({
                name: cmd.name,
                value: cmd.value,
                description: cmd.description,
              }))
          );
        },
      });
    } catch {
      // User pressed Ctrl+C or cancelled the prompt
      // @inquirer/prompts throws an error when user cancels
      console.log(''); // Add blank line
      logger.info('Goodbye!');
      process.exit(0);
    }

    // Handle exit
    if (command === 'exit') {
      logger.info('Goodbye!');
      process.exit(0);
    }

    // Execute selected command
    console.log(''); // Add blank line for readability

    switch (command) {
      case 'init': {
        // Check if .gcpb already exists
        const existingRoot = await findRoot();
        if (existingRoot) {
          logger.error('.gcpb configuration already exists');
          logger.info(`Found at: ${existingRoot}`);
        } else {
          // Initialize configuration
          const newRootDir = await initializeConfig(process.cwd());
          logger.box(
            `Initialized gcpb\n\nRoot directory: ${newRootDir}\n\nYou can now use other commands to manage repositories.`,
            'success'
          );
        }
        break;
      }

      case 'add': {
        // Check git is installed
        logger.startSpinner('Checking prerequisites...');
        const gitCheck = checkGitInstalled();
        if (!gitCheck.valid) {
          logger.stopSpinner(false, 'Git not found');
          logger.error(gitCheck.error || 'Git is not installed');
          break;
        }
        logger.stopSpinner(true, 'Prerequisites OK');

        // Find root directory
        const addRootDir = await findRoot();
        if (!addRootDir) {
          logger.error('No .gcpb configuration found');
          logger.info('Run init first');
          break;
        }

        logger.info(`Root directory: ${addRootDir}`);

        // Prompt for configuration
        const config = await promptForCloneConfigWithContext(addRootDir);

        // Clone repository
        logger.startSpinner('Cloning repository...');
        const result = await cloneRepository({
          ...config,
          rootDir: addRootDir,
        });

        if (!result.success) {
          logger.stopSpinner(false, 'Clone failed');
          if (result.error) {
            throw result.error;
          }
          break;
        }

        logger.stopSpinner(true, 'Clone complete');

        // Ask if user wants to open in VSCode
        const { openInEditor } = await inquirer.prompt<{ openInEditor: boolean }>([
          {
            type: 'confirm',
            name: 'openInEditor',
            message: 'Open in VSCode?',
            default: true,
          },
        ]);

        if (openInEditor) {
          logger.info(`Opening ${result.targetPath}...`);
          const opened = await openInVSCode({ targetPath: result.targetPath });

          if (opened) {
            logger.success('Successfully opened in VSCode');
          } else {
            logger.warn('VSCode not available. Please open manually:');
            logger.info(`  cd ${result.targetPath}`);
          }
        }

        logger.box(`Successfully cloned repository\n\nPath: ${result.targetPath}`, 'success');
        break;
      }

      case 'rm': {
        // Find root directory
        const rmRootDir = await findRoot();
        if (!rmRootDir) {
          logger.error('No .gcpb configuration found');
          logger.info('Run init first');
          break;
        }

        // Scan repositories
        logger.startSpinner('Scanning repositories...');
        const repositories = await scanRepositories(rmRootDir);
        logger.stopSpinner(true, 'Scan complete');

        if (repositories.length === 0) {
          logger.warn('No repositories found');
          logger.info('Use add command to clone repositories');
          break;
        }

        // Hierarchical selection
        const selectedOrg = await promptForOrg(repositories);
        const orgRepos = repositories.filter((r) => r.owner === selectedOrg);
        const selectedRepo = await promptForRepo(orgRepos);
        const targetRepo = orgRepos.find((r) => r.repo === selectedRepo);

        if (!targetRepo) {
          logger.error(`Repository not found: ${selectedOrg}/${selectedRepo}`);
          break;
        }

        const selectedBranches = await promptForBranches(targetRepo.branches);

        // Confirm deletion
        console.log('');
        console.log('The following branches will be removed:');
        selectedBranches.forEach((branch) => {
          console.log(`  - ${selectedOrg}/${selectedRepo}/${branch}`);
        });
        console.log('');

        const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to remove these branches?',
            default: false,
          },
        ]);

        if (!confirm) {
          logger.info('Operation cancelled');
          break;
        }

        // Remove branches
        logger.startSpinner('Removing branches...');
        for (const branch of selectedBranches) {
          const branchPath = path.join(rmRootDir, selectedOrg, selectedRepo, branch);
          await fs.remove(branchPath);
        }
        logger.stopSpinner(true, 'Removal complete');

        // Cleanup empty directories
        await cleanupEmptyDirectories(rmRootDir);

        logger.success('Successfully removed branches');
        logger.box(
          `Removed ${selectedBranches.length} branch${selectedBranches.length === 1 ? '' : 'es'}\n\nOrganization: ${selectedOrg}\nRepository: ${selectedRepo}`,
          'success'
        );
        break;
      }

      case 'open': {
        // Find root directory
        const openRootDir = await findRoot();
        if (!openRootDir) {
          logger.error('No .gcpb configuration found');
          logger.info('Run init first');
          break;
        }

        // Scan repositories
        logger.startSpinner('Scanning repositories...');
        const repositories = await scanRepositories(openRootDir);
        logger.stopSpinner(true, 'Scan complete');

        if (repositories.length === 0) {
          logger.warn('No repositories found');
          logger.info('Use add command to clone repositories');
          break;
        }

        // Hierarchical selection
        const selectedOrg = await promptForOrgOpen(repositories);
        const orgRepos = repositories.filter((r) => r.owner === selectedOrg);

        if (orgRepos.length === 0) {
          logger.error(`No repositories found for organization: ${selectedOrg}`);
          break;
        }

        const selectedRepo = await promptForRepoOpen(orgRepos);
        const targetRepoInfo = orgRepos.find((r) => r.repo === selectedRepo);

        if (!targetRepoInfo) {
          logger.error(`Repository not found: ${selectedOrg}/${selectedRepo}`);
          break;
        }

        const selectedBranch = await promptForBranch(targetRepoInfo.branches);
        const branchPath = path.join(openRootDir, selectedOrg, selectedRepo, selectedBranch);

        // Verify directory exists
        const exists = await fs.pathExists(branchPath);
        if (!exists) {
          logger.error(`Branch directory not found: ${branchPath}`);
          break;
        }

        // Open in VSCode
        logger.info(`Opening ${selectedOrg}/${selectedRepo}/${selectedBranch}...`);
        const opened = await openInVSCode({ targetPath: branchPath });

        if (opened) {
          logger.success('Successfully opened in VSCode');
          logger.box(
            `Opened in VSCode:\n${selectedOrg}/${selectedRepo}/${selectedBranch}\n\nPath: ${branchPath}`,
            'success'
          );
        } else {
          logger.warn('VSCode not available. Please open manually:');
          logger.info(`  cd ${branchPath}`);
        }
        break;
      }
    }

    // Return to interactive mode (loop)
    console.log(''); // Add blank line
    await runInteractiveMode();
  } catch (error) {
    // Check if it's a cancellation error (user pressed Ctrl+C during command execution)
    if (error instanceof Error) {
      // Common cancellation errors from inquirer
      const isCancellation =
        error.message.includes('User force closed') ||
        error.message.includes('canceled') ||
        error.message.includes('cancelled') ||
        error.name === 'ExitPromptError';

      if (isCancellation) {
        console.log(''); // Add blank line
        logger.info('Goodbye!');
        process.exit(0);
      }
    }

    handleError(error, logger);
    // Return to interactive mode even on error
    console.log('');
    await runInteractiveMode();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(''); // Add blank line
  logger.info('Goodbye!');
  process.exit(0);
});

// Set default action for no arguments (interactive mode)
program.action(async () => {
  await runInteractiveMode();
});

program.parse();
