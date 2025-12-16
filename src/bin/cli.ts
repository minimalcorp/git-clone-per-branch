import { Command } from 'commander';
import { promptForCloneConfig } from '../prompts/interactive.js';
import { promptForOrg, promptForRepo, promptForBranches } from '../prompts/remove.js';
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
      const config = await promptForCloneConfig(rootDir);

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
      handleError(error, logger);
      process.exit(1);
    }
  });

program.parse();
