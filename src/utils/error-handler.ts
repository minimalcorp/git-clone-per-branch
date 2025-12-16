import { GCPBError } from '../types/index.js';
import { Logger } from './logger.js';

export function handleError(error: unknown, logger: Logger): void {
  if (error instanceof GCPBError) {
    logger.error(error.message);
    if (error.suggestion) {
      logger.info(`Suggestion: ${error.suggestion}`);
    }
    if (process.env.DEBUG && error.originalError) {
      console.error('\nOriginal error:', error.originalError);
    }
    return;
  }

  if (error instanceof Error) {
    // Map common Node.js errors
    if ('code' in error) {
      const code = (error as NodeJS.ErrnoException).code;

      switch (code) {
        case 'EACCES':
        case 'EPERM':
          logger.error('Permission denied');
          logger.info(
            'Suggestion: Please check you have write permissions to the current directory'
          );
          break;

        case 'EEXIST':
          logger.error('Directory already exists');
          logger.info(
            'Suggestion: Please use a different branch name or remove the existing directory'
          );
          break;

        case 'ENOSPC':
          logger.error('Insufficient disk space');
          logger.info('Suggestion: Please free up space and try again');
          break;

        case 'ENOTFOUND':
        case 'ETIMEDOUT':
          logger.error('Network error: Failed to connect to the remote repository');
          logger.info('Suggestion: Please check your internet connection and try again');
          break;

        default:
          logger.error(error.message);
      }
    } else {
      // Check for git-specific errors
      const errorMsg = error.message.toLowerCase();

      if (errorMsg.includes('authentication') || errorMsg.includes('permission denied')) {
        logger.error('Authentication failed');
        if (errorMsg.includes('ssh')) {
          logger.info(
            'Suggestion: Please ensure your SSH key is configured: https://docs.github.com/en/authentication'
          );
        } else {
          logger.info('Suggestion: Please check your credentials or use SSH instead');
        }
      } else if (errorMsg.includes('repository not found')) {
        logger.error('Repository not found');
        logger.info('Suggestion: Please check the repository URL and your access permissions');
      } else if (errorMsg.includes('branch') && errorMsg.includes('not found')) {
        logger.error('Base branch not found in the repository');
        logger.info(
          'Suggestion: Please check the branch name. Common branches: main, master, develop'
        );
      } else {
        logger.error(error.message);
      }
    }

    if (process.env.DEBUG) {
      console.error('\nStack trace:', error.stack);
    }
  } else {
    logger.error('An unknown error occurred');
    if (process.env.DEBUG) {
      console.error('\nError details:', error);
    }
  }
}
