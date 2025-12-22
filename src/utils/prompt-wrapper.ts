import inquirer from 'inquirer';
import { keypressHandler } from './keypress-handler.js';

/**
 * Check if an error is from Ctrl+C (should exit app)
 */
function isExitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'ExitPromptError' || error.message.includes('User force closed');
  }
  return false;
}

/**
 * Wraps inquirer.prompt and checks for ESC key after completion
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function wrappedPrompt<T extends Record<string, any>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  questions: any
): Promise<T> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await inquirer.prompt(questions);

    // Check if ESC was pressed during the prompt
    keypressHandler.checkAndThrow();

    return result as T;
  } catch (error) {
    // Ctrl+C - re-throw to let it exit the app
    if (isExitError(error)) {
      throw error;
    }

    // Other errors (including ESC key error from checkAndThrow)
    throw error;
  }
}

/**
 * Wraps any async prompt function and checks for ESC key after completion
 */
export async function wrapPromptFunction<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();

    // Check if ESC was pressed during the prompt
    keypressHandler.checkAndThrow();

    return result;
  } catch (error) {
    // Ctrl+C - re-throw to let it exit the app
    if (isExitError(error)) {
      throw error;
    }

    // Other errors (including ESC key error from checkAndThrow)
    throw error;
  }
}
