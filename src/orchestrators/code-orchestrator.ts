/**
 * Orchestrator for the 'code' command
 * Handles both direct execution (all args provided) and interactive mode
 */

import path from 'path';
import { openInVSCode } from '../core/editor.js';
import { scanRepositories } from '../core/repository-scanner.js';
import { openSelectBranch, openSelectOrg, openSelectRepo } from '../state/open-states.js';
import { EscapeCancelError, type CodeResult } from '../types/index.js';
import { parsePathArg } from '../utils/arg-parser.js';
import type { Logger } from '../utils/logger.js';

/**
 * Execute code command with direct path (non-interactive)
 * Used when user provides complete path: gcpb code org/repo/branch
 */
export async function executeCodeCommand(
  rootDir: string,
  pathArg: string,
  logger: Logger
): Promise<CodeResult> {
  try {
    const parsed = parsePathArg(pathArg);

    if (!parsed.isComplete) {
      const got = [parsed.org, parsed.repo, parsed.branch].filter(Boolean).join('/') || '(empty)';
      throw new Error(
        `Incomplete path provided: "${got}"\n` +
          `Expected format: org/repo/branch\n` +
          `Tip: Run without arguments for interactive mode`
      );
    }

    // At this point, isComplete guarantees org, repo, and branch are all defined
    const org = parsed.org as string;
    const repo = parsed.repo as string;
    const branch = parsed.branch as string;

    // Scan repositories to verify the branch exists
    const repositories = await scanRepositories(rootDir);

    // Find the specified repository
    const targetRepo = repositories.find((r) => r.owner === org && r.repo === repo);

    if (!targetRepo) {
      throw new Error(`Repository ${org}/${repo} not found`);
    }

    // Verify the branch exists
    if (!targetRepo.branches.includes(branch)) {
      throw new Error(
        `Branch '${branch}' not found in ${org}/${repo}. Available branches: ${targetRepo.branches.join(', ')}`
      );
    }

    // Construct target path
    const targetPath = path.join(rootDir, org, repo, branch);

    // Open in VSCode
    logger.info(`Opening ${org}/${repo}/${branch} in VSCode...`);
    const opened = await openInVSCode({ targetPath });

    if (opened) {
      logger.success('Successfully opened in VSCode');
      return { success: true, targetPath, vscodeOpened: true };
    } else {
      logger.warn('VSCode not available. Please open manually:');
      logger.info(`  cd ${targetPath}`);
      return {
        success: true,
        targetPath,
        vscodeOpened: false,
      };
    }
  } catch (error) {
    // EscapeCancelError should propagate to CLI for menu navigation
    if (error instanceof EscapeCancelError) {
      throw error;
    }

    // ExitPromptError should propagate to CLI for immediate exit
    if (error instanceof Error && error.name === 'ExitPromptError') {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to open: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute code command interactively (prompts for missing information)
 * Used when user provides no args or partial args
 */
export async function executeCodeCommandInteractive(
  rootDir: string,
  pathArg?: string,
  logger?: Logger
): Promise<CodeResult> {
  try {
    // Parse partial path if provided
    const parsed = parsePathArg(pathArg);

    // Scan repositories
    const repositories = await scanRepositories(rootDir);

    if (repositories.length === 0) {
      throw new Error('No repositories found. Please clone a repository first using "gcpb add"');
    }

    // State 1: Select organization (skip if provided)
    const orgResult = await openSelectOrg({
      repositories,
      preselectedOrg: parsed.org,
    });
    const org = orgResult.value.org;

    // State 2: Select repository (skip if provided)
    const repoResult = await openSelectRepo({
      repositories,
      org,
      preselectedRepo: parsed.repo,
    });
    const repo = repoResult.value.repo;

    // Get branches for selected repo
    const targetRepo = repositories.find((r) => r.owner === org && r.repo === repo);
    if (!targetRepo) {
      throw new Error(`Repository ${org}/${repo} not found`);
    }

    // State 3: Select branch (skip if provided and valid)
    const branchResult = await openSelectBranch({
      branches: targetRepo.branches,
      preselectedBranch: parsed.branch,
    });
    const branch = branchResult.value.branch;

    // Construct target path
    const targetPath = path.join(rootDir, org, repo, branch);

    // Open in VSCode
    if (logger) {
      logger.info(`Opening ${org}/${repo}/${branch} in VSCode...`);
    }
    const opened = await openInVSCode({ targetPath });

    if (opened) {
      if (logger) {
        logger.success('Successfully opened in VSCode');
      }
      return { success: true, targetPath, vscodeOpened: true };
    } else {
      if (logger) {
        logger.warn('VSCode not available. Please open manually:');
        logger.info(`  cd ${targetPath}`);
      }
      return {
        success: true,
        targetPath,
        vscodeOpened: false,
      };
    }
  } catch (error) {
    // EscapeCancelError should propagate to CLI for menu navigation
    if (error instanceof EscapeCancelError) {
      throw error;
    }

    // ExitPromptError should propagate to CLI for immediate exit
    if (error instanceof Error && error.name === 'ExitPromptError') {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (logger) {
      logger.error(`Failed to open: ${errorMessage}`);
    }
    return { success: false, error: errorMessage };
  }
}
