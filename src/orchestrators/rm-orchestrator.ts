/**
 * Orchestrator for the 'rm' (remove) command
 * Handles both direct execution (all args provided) and interactive mode
 */

import fs from 'fs-extra';
import path from 'path';
import { cleanupEmptyDirectories } from '../core/config.js';
import { scanRepositories } from '../core/repository-scanner.js';
import {
  rmConfirmRemoval,
  rmSelectBranches,
  rmSelectOrg,
  rmSelectRepo,
} from '../state/rm-states.js';
import { parsePathArg } from '../utils/arg-parser.js';
import type { Logger } from '../utils/logger.js';

export interface RemoveResult {
  success: boolean;
  removedCount?: number;
  error?: string;
  org?: string;
  repo?: string;
  branches?: string[];
}

/**
 * Execute remove command with direct path and force flag (non-interactive)
 * Used when user provides complete path: gcpb rm org/repo/branch --force
 */
export async function executeRemoveCommand(
  rootDir: string,
  pathArg: string,
  force: boolean,
  logger: Logger
): Promise<RemoveResult> {
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

    // Confirm removal (skip if force flag is set)
    const confirmResult = await rmConfirmRemoval({
      rootDir,
      org,
      repo,
      branches: [branch],
      force,
    });

    if (!confirmResult.value.confirmed) {
      logger.info('Operation cancelled');
      return { success: false, error: 'Operation cancelled by user' };
    }

    // Remove branch
    logger.startSpinner('Removing branch...');
    const branchPath = path.join(rootDir, org, repo, branch);
    await fs.remove(branchPath);
    logger.stopSpinner(true, 'Removal complete');

    // Cleanup empty directories
    await cleanupEmptyDirectories(rootDir);

    logger.success('Successfully removed branch');
    logger.box(
      `Removed branch\n\nOrganization: ${org}\nRepository: ${repo}\nBranch: ${branch}`,
      'success'
    );

    return {
      success: true,
      removedCount: 1,
      org,
      repo,
      branches: [branch],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to remove: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute remove command interactively (prompts for missing information)
 * Used when user provides no args or partial args
 */
export async function executeRemoveCommandInteractive(
  rootDir: string,
  pathArg?: string,
  force?: boolean,
  logger?: Logger
): Promise<RemoveResult> {
  try {
    // Parse partial path if provided
    const parsed = parsePathArg(pathArg);

    // Scan repositories
    const repositories = await scanRepositories(rootDir);

    if (repositories.length === 0) {
      throw new Error('No repositories found. Please clone a repository first using "gcpb add"');
    }

    // State 1: Select organization (skip if provided)
    const orgResult = await rmSelectOrg({
      repositories,
      preselectedOrg: parsed.org,
    });
    const org = orgResult.value.org;

    // State 2: Select repository (skip if provided)
    const repoResult = await rmSelectRepo({
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

    // State 3: Select branches (skip if provided and valid)
    const branchesResult = await rmSelectBranches({
      branches: targetRepo.branches,
      preselectedBranch: parsed.branch,
    });
    const selectedBranches = branchesResult.value.selectedBranches;

    // State 4: Confirm removal (skip if force flag is set)
    const confirmResult = await rmConfirmRemoval({
      rootDir,
      org,
      repo,
      branches: selectedBranches,
      force,
    });

    if (!confirmResult.value.confirmed) {
      if (logger) {
        logger.info('Operation cancelled');
      }
      return { success: false, error: 'Operation cancelled by user' };
    }

    // Remove branches
    if (logger) {
      const total = selectedBranches.length;
      logger.startSpinner(`Removing ${total} branch${total === 1 ? '' : 'es'}...`);
      let removed = 0;
      for (const branch of selectedBranches) {
        const branchPath = path.join(rootDir, org, repo, branch);
        await fs.remove(branchPath);
        removed++;
        if (total > 1) {
          logger.updateSpinner(`Removed ${removed}/${total} branches...`);
        }
      }
      logger.stopSpinner(
        true,
        `Successfully removed ${removed} branch${removed === 1 ? '' : 'es'}`
      );
    } else {
      for (const branch of selectedBranches) {
        const branchPath = path.join(rootDir, org, repo, branch);
        await fs.remove(branchPath);
      }
    }

    // Cleanup empty directories
    await cleanupEmptyDirectories(rootDir);

    if (logger) {
      logger.success('Successfully removed branches');
      logger.box(
        `Removed ${selectedBranches.length} branch${selectedBranches.length === 1 ? '' : 'es'}\n\nOrganization: ${org}\nRepository: ${repo}`,
        'success'
      );
    }

    return {
      success: true,
      removedCount: selectedBranches.length,
      org,
      repo,
      branches: selectedBranches,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (logger) {
      logger.error(`Failed to remove: ${errorMessage}`);
    }
    return { success: false, error: errorMessage };
  }
}
