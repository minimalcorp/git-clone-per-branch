import { Command } from 'commander';
import { promptForCloneConfig } from '../prompts/interactive.js';
import { cloneRepository } from '../core/clone.js';
import { openInVSCode } from '../core/vscode.js';
import { Logger } from '../utils/logger.js';
import { handleError } from '../utils/error-handler.js';
import { checkGitInstalled } from '../utils/validators.js';

const logger = new Logger();

const program = new Command();

program
  .name('cpb')
  .description('Clone git repository per branch - alternative to git worktree')
  .version('0.1.0')
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

      // 2. Prompt for configuration
      const config = await promptForCloneConfig();

      // 3. Clone repository
      logger.startSpinner('Cloning repository...');
      const result = await cloneRepository({
        ...config,
        cwd: process.cwd(),
      });

      if (!result.success) {
        logger.stopSpinner(false, 'Clone failed');
        if (result.error) {
          throw result.error;
        }
        throw new Error('Clone failed with unknown error');
      }
      logger.stopSpinner(true, 'Repository cloned successfully');

      // 4. Open in VSCode
      logger.info('Opening in VSCode...');
      const opened = await openInVSCode({ targetPath: result.targetPath });

      if (opened) {
        logger.success(`Successfully opened in VSCode`);
      } else {
        logger.warn('VSCode not available. Please open manually:');
        logger.info(`  cd ${result.targetPath}`);
      }

      // 5. Show success message
      logger.box(
        `Repository cloned to:\n${result.targetPath}\n\nBranch: ${config.targetBranch}`,
        'success'
      );
    } catch (error) {
      handleError(error, logger);
      process.exit(1);
    }
  });

program.parse();
