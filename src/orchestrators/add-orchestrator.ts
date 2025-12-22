/**
 * Orchestrator for the 'add' command
 * Handles both direct execution (all args provided) and interactive mode with context detection
 */

import path from 'path';
import { cloneRepository } from '../core/clone.js';
import { detectContext } from '../core/context-detector.js';
import { parseGitUrl } from '../core/url-parser.js';
import {
  addConfigureBranches,
  addConfirmClone,
  addConfirmUrl,
  addEnterUrl,
  addResolveUrl,
  addSelectMode,
  addSelectOwner,
  addSelectRepo,
} from '../state/add-states.js';
import type { CloneResult } from '../types/index.js';
import type { Logger } from '../utils/logger.js';
import { sanitizeBranchName } from '../utils/validators.js';

export interface AddResult {
  success: boolean;
  targetPath?: string;
  error?: string;
  cloneResult?: CloneResult;
}

/**
 * Execute add command with direct arguments (non-interactive)
 * Used when user provides complete args: gcpb add <url> <baseBranch> <targetBranch> [--yes]
 */
export async function executeAddCommand(
  rootDir: string,
  url: string,
  baseBranch: string,
  targetBranch: string,
  skipConfirmation: boolean,
  logger: Logger
): Promise<AddResult> {
  try {
    // Parse URL to get owner and repo
    const parsed = parseGitUrl(url);
    const targetPath = path.join(
      rootDir,
      parsed.owner,
      parsed.repo,
      sanitizeBranchName(targetBranch)
    );

    // State: Confirm clone (skip if --yes flag set)
    const confirmResult = await addConfirmClone({
      url,
      baseBranch,
      targetBranch,
      targetPath,
      skipConfirmation,
    });

    if (!confirmResult.value.confirmed) {
      logger.info('Operation cancelled');
      return { success: false, error: 'Operation cancelled by user' };
    }

    // Clone repository
    logger.startSpinner('Cloning repository...');
    const cloneResult = await cloneRepository({
      cloneUrl: url,
      baseBranch,
      targetBranch,
      rootDir,
    });
    logger.stopSpinner(true, 'Clone complete');

    logger.success('Successfully cloned repository');
    logger.box(
      `Repository cloned to:\n${cloneResult.targetPath}\n\nBranch: ${targetBranch}`,
      'success'
    );

    return {
      success: true,
      targetPath: cloneResult.targetPath,
      cloneResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to clone: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute add command interactively (prompts for missing information)
 * Uses context detection to provide smart defaults and skip unnecessary prompts
 */
export async function executeAddCommandInteractive(
  rootDir: string,
  currentDir: string,
  logger?: Logger
): Promise<AddResult> {
  try {
    // Detect context to provide smart defaults
    const context = await detectContext(rootDir, currentDir);

    let url: string | undefined;
    let owner: string | undefined;
    let repo: string | undefined;

    // State 1: Select mode (manual vs select from existing)
    // Only relevant at root level with existing owners
    if (
      context.location === 'root' &&
      context.availableOwners &&
      context.availableOwners.length > 0
    ) {
      const modeResult = await addSelectMode({
        hasExistingOwners: true,
      });

      if (modeResult.value.mode === 'manual') {
        // User chose manual entry, skip to URL entry
        const urlResult = await addEnterUrl({});
        url = urlResult.value.url;
      }
      // If mode === 'select', continue to owner selection below
    } else {
      // No existing owners or not at root, go straight to manual URL entry
      const urlResult = await addEnterUrl({});
      url = urlResult.value.url;
    }

    // State 2 & 3: Select owner and repo (if select mode was chosen and URL not yet determined)
    if (!url && context.location === 'root' && context.availableOwners) {
      // State 2: Select owner
      const ownerResult = await addSelectOwner({
        rootDir,
        availableOwners: context.availableOwners,
      });
      owner = ownerResult.value.owner;

      // Get repos for selected owner
      const ownerContext = await detectContext(rootDir, path.join(rootDir, owner));
      if (ownerContext.availableRepos && ownerContext.availableRepos.length > 0) {
        // State 3: Select repo
        const repoResult = await addSelectRepo({
          availableRepos: ownerContext.availableRepos,
        });
        repo = repoResult.value.repo;
      } else {
        // No repos found for this owner, fall back to manual URL entry
        if (logger) {
          logger.warn('No repositories found for this owner.');
        }
        const urlResult = await addEnterUrl({});
        url = urlResult.value.url;
      }
    }

    // State 4 & 5: Resolve URL from existing branches (if owner/repo determined but no URL yet)
    if (!url && owner && repo) {
      if (logger) {
        logger.info(`Detected context: ${owner}/${repo}`);
      }

      // State 4: Try to resolve URL
      const resolveResult = await addResolveUrl({
        rootDir,
        owner,
        repo,
      });

      if (resolveResult.value.url && resolveResult.value.detectedFrom) {
        // State 5: Confirm detected URL (both url and detectedFrom exist)
        const confirmResult = await addConfirmUrl({
          url: resolveResult.value.url,
          detectedFrom: resolveResult.value.detectedFrom,
        });

        if (confirmResult.value.useDetected) {
          url = resolveResult.value.url;
        } else {
          // User declined detected URL, prompt for manual entry
          const urlResult = await addEnterUrl({});
          url = urlResult.value.url;
        }
      } else {
        // Could not detect URL from existing branches
        if (logger) {
          logger.info('Could not detect repository URL from existing branches.');
        }
        const urlResult = await addEnterUrl({});
        url = urlResult.value.url;
      }
    }

    // At this point, url must be defined
    if (!url) {
      throw new Error('No repository URL specified');
    }

    // Parse URL to get owner and repo
    const parsed = parseGitUrl(url);

    // State 7: Configure branches
    const branchesResult = await addConfigureBranches({
      url,
      rootDir,
      owner: parsed.owner,
      repo: parsed.repo,
    });

    const baseBranch = branchesResult.value.baseBranch;
    const targetBranch = branchesResult.value.targetBranch;

    // Construct target path
    const targetPath = path.join(
      rootDir,
      parsed.owner,
      parsed.repo,
      sanitizeBranchName(targetBranch)
    );

    // State 8: Final confirmation
    const confirmResult = await addConfirmClone({
      url,
      baseBranch,
      targetBranch,
      targetPath,
      skipConfirmation: false,
    });

    if (!confirmResult.value.confirmed) {
      if (logger) {
        logger.info('Operation cancelled');
      }
      return { success: false, error: 'Operation cancelled by user' };
    }

    // Clone repository
    if (logger) {
      logger.startSpinner('Cloning repository...');
    }
    const cloneResult = await cloneRepository({
      cloneUrl: url,
      baseBranch,
      targetBranch,
      rootDir,
    });
    if (logger) {
      logger.stopSpinner(true, 'Clone complete');
      logger.success('Successfully cloned repository');
      logger.box(
        `Repository cloned to:\n${cloneResult.targetPath}\n\nBranch: ${targetBranch}`,
        'success'
      );
    }

    return {
      success: true,
      targetPath: cloneResult.targetPath,
      cloneResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (logger) {
      logger.error(`Failed to clone: ${errorMessage}`);
    }
    return { success: false, error: errorMessage };
  }
}
