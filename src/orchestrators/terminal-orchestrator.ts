/**
 * Orchestrator for the 'terminal' command
 * Handles both direct execution (all args provided) and interactive mode
 */

import path from 'path';
import { openInTerminal } from '../core/terminal-launcher.js';
import { scanRepositories } from '../core/repository-scanner.js';
import { openSelectBranch, openSelectOrg, openSelectRepo } from '../state/open-states.js';
import { EscapeCancelError, type TerminalResult } from '../types/index.js';
import { parsePathArg } from '../utils/arg-parser.js';
import type { Logger } from '../utils/logger.js';

/**
 * Execute terminal command with direct path (non-interactive)
 * Used when user provides complete path: gcpb terminal org/repo/branch
 */
export async function executeTerminalCommand(
  rootDir: string,
  pathArg: string,
  logger: Logger
): Promise<TerminalResult> {
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

    // Open in terminal
    logger.info(`Opening ${org}/${repo}/${branch} in terminal...`);
    const opened = await openInTerminal({ targetPath });

    if (opened) {
      logger.success('Successfully opened in terminal');
      return { success: true, targetPath, terminalOpened: true };
    } else {
      logger.warn('Terminal not available. Please open manually:');
      logger.info(`  cd ${targetPath}`);
      return {
        success: true,
        targetPath,
        terminalOpened: false,
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
 * Execute terminal command interactively (prompts for missing information)
 * Used when user provides no args or partial args
 */
export async function executeTerminalCommandInteractive(
  rootDir: string,
  pathArg?: string,
  logger?: Logger
): Promise<TerminalResult> {
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

    // Open in terminal
    if (logger) {
      logger.info(`Opening ${org}/${repo}/${branch} in terminal...`);
    }
    const opened = await openInTerminal({ targetPath });

    if (opened) {
      if (logger) {
        logger.success('Successfully opened in terminal');
      }
      return { success: true, targetPath, terminalOpened: true };
    } else {
      if (logger) {
        logger.warn('Terminal not available. Please open manually:');
        logger.info(`  cd ${targetPath}`);
      }
      return {
        success: true,
        targetPath,
        terminalOpened: false,
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
