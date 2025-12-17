import { spawn } from 'cross-spawn';
import type { VSCodeOptions } from '../types/index.js';
import { loadConfig, updateEditorPreferences } from './config.js';
import { promptForEditorOpening } from '../prompts/editor.js';
import type { Logger } from '../utils/logger.js';

export async function openInVSCode(options: VSCodeOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Try to open with 'code' command
    const child = spawn('code', [options.targetPath], {
      stdio: 'ignore',
      detached: true,
    });

    child.on('error', () => {
      // 'code' command not found
      resolve(false);
    });

    child.on('spawn', () => {
      // Successfully spawned
      child.unref();
      resolve(true);
    });
  });
}

/**
 * Handles editor opening with user preferences
 * Checks config for auto-open preference, prompts if needed, and opens editor accordingly
 */
export async function handleEditorOpening(
  targetPath: string,
  rootDir: string,
  logger: Logger
): Promise<void> {
  try {
    // Load configuration to check for editor preferences
    const config = await loadConfig(rootDir);
    const autoOpen = config.editor?.autoOpen;

    let shouldOpen: boolean;

    if (autoOpen === true) {
      // User has set auto-open to true, open without prompting
      shouldOpen = true;
    } else if (autoOpen === false) {
      // User has set auto-open to false, skip without prompting
      shouldOpen = false;
    } else {
      // No preference set (null or undefined), prompt the user
      const { openInEditor, rememberChoice } = await promptForEditorOpening();
      shouldOpen = openInEditor;

      if (rememberChoice) {
        // Save the preference for future use
        await updateEditorPreferences(rootDir, { autoOpen: openInEditor });
      }
    }

    if (shouldOpen) {
      logger.info('Opening in VSCode...');
      const opened = await openInVSCode({ targetPath });

      if (opened) {
        logger.success('Successfully opened in VSCode');
      } else {
        logger.warn('VSCode not available. Please open manually:');
        logger.info(`  cd ${targetPath}`);
      }
    } else {
      // User chose not to open, no message needed
    }
  } catch {
    // If there's an error loading config or updating preferences, log it but don't fail
    logger.warn('Failed to handle editor preferences, skipping editor opening');
  }
}
