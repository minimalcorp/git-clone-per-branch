import { Command } from 'commander';
import { search } from '@inquirer/prompts';
import { executeAddCommandInteractive } from '../orchestrators/add-orchestrator.js';
import { executeRemoveCommandInteractive } from '../orchestrators/rm-orchestrator.js';
import { executeOpenCommandInteractive } from '../orchestrators/open-orchestrator.js';
import { handleEditorOpening } from '../core/editor.js';
import { EscapeCancelError } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { terminalManager } from '../utils/terminal.js';
import { handleError } from '../utils/error-handler.js';
import { checkGitInstalled } from '../utils/validators.js';
import { findRoot, initializeConfig } from '../core/config.js';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const logger = new Logger();

// Register terminal cleanup handlers for all exit scenarios
terminalManager.registerCleanupHandlers();

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
        terminalManager.exitWithMessage('ℹ Goodbye!');
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
      // Check git is installed
      logger.startSpinner('Checking prerequisites...');
      const gitCheck = checkGitInstalled();
      if (!gitCheck.valid) {
        logger.stopSpinner(false, 'Git not found');
        logger.error(gitCheck.error || 'Git is not installed');
        process.exit(1);
      }
      logger.stopSpinner(true, 'Prerequisites OK');

      // Find root directory
      const rootDir = await findRoot();
      if (!rootDir) {
        logger.error('No .gcpb configuration found');
        logger.info('Run "gcpb init" to initialize');
        process.exit(1);
      }

      logger.info(`Root directory: ${rootDir}`);

      // Execute add command with orchestrator
      const result = await executeAddCommandInteractive(rootDir, process.cwd(), logger);

      if (!result.success) {
        process.exit(1);
      }

      // Handle editor opening
      if (result.targetPath) {
        await handleEditorOpening(result.targetPath, rootDir, logger);
      }
    } catch (error) {
      if (isCancellationError(error)) {
        terminalManager.exitWithMessage('ℹ Goodbye!');
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
      // Find root directory
      const rootDir = await findRoot();
      if (!rootDir) {
        logger.error('No .gcpb configuration found');
        logger.info('Run "gcpb init" to initialize');
        process.exit(1);
      }

      // Execute remove command with orchestrator
      const result = await executeRemoveCommandInteractive(
        rootDir,
        targetPath,
        options?.force,
        logger
      );

      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      if (isCancellationError(error)) {
        terminalManager.exitWithMessage('ℹ Goodbye!');
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
      // Find root directory
      const rootDir = await findRoot();
      if (!rootDir) {
        logger.error('No .gcpb configuration found');
        logger.info('Run "gcpb init" to initialize');
        process.exit(1);
      }

      // Execute open command with orchestrator
      const result = await executeOpenCommandInteractive(rootDir, targetPath, logger);

      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      if (isCancellationError(error)) {
        terminalManager.exitWithMessage('ℹ Goodbye!');
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
  // Initialize REPL layout with scroll region
  let layout: ReturnType<typeof terminalManager.initializeREPLLayout> | null = null;

  if (process.stdout.isTTY) {
    // Clear screen first
    console.clear();

    // Initialize scroll region layout
    layout = terminalManager.initializeREPLLayout();
  }

  // Use loop instead of recursion
  while (true) {
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
            {
              name: 'add - Clone a repository branch',
              value: 'add',
              description: 'Clone a new branch',
            },
            {
              name: 'rm - Remove cloned branches',
              value: 'rm',
              description: 'Remove existing branches',
            },
            {
              name: 'open - Open a branch in VSCode',
              value: 'open',
              description: 'Open branch in editor',
            },
            { name: 'Exit', value: 'exit', description: 'Exit interactive mode' },
          ]
        : [
            {
              name: 'init - Initialize .gcpb configuration',
              value: 'init',
              description: 'Setup gcpb',
            },
            { name: 'Exit', value: 'exit', description: 'Exit interactive mode' },
          ];

      // Draw divider at fixed line
      if (layout && process.stdout.isTTY) {
        const { columns } = terminalManager.getTerminalSize();
        terminalManager.drawFixedLine(layout.dividerLine, '─'.repeat(columns));
      }

      // Show interactive prompt
      let command: string;
      try {
        // Temporarily reset scroll region for Inquirer
        if (layout && process.stdout.isTTY) {
          terminalManager.resetScrollRegion();

          // Move to menu start line
          process.stdout.write(`\x1b[${layout.menuStartLine};1H`);

          // Clear from cursor to end of screen
          process.stdout.write('\x1b[J');

          // Show cursor
          process.stdout.write('\x1b[?25h');
        }

        // Use regular search (no ESC support) for main menu
        // ESC key will be ignored, only Ctrl+C will exit
        command = await search({
          message: hasConfig ? 'Select a command:' : 'Initialize gcpb first:',
          source: async (term: string | undefined) => {
            const searchTerm = (term || '').toLowerCase();
            return Promise.resolve(
              commands
                .filter(
                  (cmd) =>
                    cmd.name.toLowerCase().includes(searchTerm) || cmd.value.includes(searchTerm)
                )
                .map((cmd) => ({
                  name: cmd.name,
                  value: cmd.value,
                  description: cmd.description,
                }))
            );
          },
        });
      } catch (_error) {
        // Ctrl+C or other errors - exit
        terminalManager.exitWithMessage('ℹ Goodbye!');
        process.exit(0);
      }

      // Restore scroll region before command execution
      if (layout && process.stdout.isTTY) {
        terminalManager.setScrollRegion(1, layout.logLines);
        // Move cursor to log area
        process.stdout.write(`\x1b[${layout.logLines};1H\n`);
      }

      // Handle exit
      if (command === 'exit') {
        terminalManager.exitWithMessage('ℹ Goodbye!');
        process.exit(0);
      }

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

          // Execute add command with orchestrator
          const result = await executeAddCommandInteractive(addRootDir, process.cwd(), logger);

          if (!result.success) {
            break;
          }

          // Handle editor opening with preferences
          if (result.targetPath) {
            await handleEditorOpening(result.targetPath, addRootDir, logger);
          }
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

          // Execute remove command with orchestrator
          await executeRemoveCommandInteractive(rmRootDir, undefined, false, logger);
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

          // Execute open command with orchestrator
          await executeOpenCommandInteractive(openRootDir, undefined, logger);
          break;
        }
      }

      // Command completed - ensure we're in log area with scroll region active
      if (layout && process.stdout.isTTY) {
        terminalManager.setScrollRegion(1, layout.logLines);
        process.stdout.write(`\x1b[${layout.logLines};1H\n`);
      }
    } catch (error) {
      // Ctrl+C - exit application (highest priority)
      if (error instanceof Error && error.name === 'ExitPromptError') {
        terminalManager.exitWithMessage('ℹ Goodbye!');
        process.exit(0);
      }

      // ESC key pressed - return to main menu silently
      if (error instanceof EscapeCancelError) {
        // Ensure scroll region is active for log area
        if (layout && process.stdout.isTTY) {
          terminalManager.setScrollRegion(1, layout.logLines);
          process.stdout.write(`\x1b[${layout.logLines};1H\n`);
        }
        continue; // Continue the loop to show menu again
      }

      // Other errors - return to menu
      handleError(error, logger);

      // Ensure scroll region is active for log area
      if (layout && process.stdout.isTTY) {
        terminalManager.setScrollRegion(1, layout.logLines);
        process.stdout.write(`\x1b[${layout.logLines};1H\n`);
      }
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  terminalManager.exitWithMessage('ℹ Goodbye!');
  process.exit(0);
});

// Set default action for no arguments (interactive mode)
program.action(async () => {
  await runInteractiveMode();
});

program.parse();
