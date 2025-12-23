import simpleGit, { type SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import type { CloneOptions, CloneResult } from '../types/index.js';
import { GCPBError } from '../types/index.js';
import { parseGitUrl } from './url-parser.js';
import {
  validateTargetPath,
  sanitizeBranchName,
  validateRemoteBranchNotExists,
} from '../utils/validators.js';
import { getCacheInfo, createCache, updateCache, removeCache } from './cache-manager.js';

/**
 * Get the default branch name from the remote repository
 */
async function getDefaultBranch(git: SimpleGit): Promise<string> {
  try {
    // Get default branch from origin/HEAD
    const result = await git.revparse(['--abbrev-ref', 'origin/HEAD']);
    // Result format: "origin/main" -> extract "main"
    return result.replace('origin/', '').trim();
  } catch {
    // Fallback: assume "main" if detection fails
    return 'main';
  }
}

export async function cloneRepository(options: CloneOptions): Promise<CloneResult> {
  let targetPath = '';
  let shouldCleanupOnError = false;

  try {
    // 1. Parse git URL to get owner and repo
    const parsed = parseGitUrl(options.cloneUrl);

    // 2. Construct target path: ${rootDir}/${owner}/${repo}/${targetBranch}
    // Sanitize branch name to avoid nested directories (feat/xxx -> feat-xxx)
    targetPath = path.join(
      options.rootDir,
      parsed.owner,
      parsed.repo,
      sanitizeBranchName(options.targetBranch)
    );

    // 3. Check if target directory exists (fail early)
    const pathValidation = await validateTargetPath(targetPath);
    if (!pathValidation.valid) {
      throw new GCPBError(
        pathValidation.error || 'Target directory validation failed',
        'Please use a different branch name or remove the existing directory'
      );
    }

    // From this point onwards, if an error occurs, we should cleanup the cloned directory
    shouldCleanupOnError = true;

    // 4. Create parent directories if needed
    await fs.ensureDir(path.dirname(targetPath));

    // 5. Prepare cache (if possible)
    let useCache = true;
    let cachePath: string | undefined;

    try {
      const cacheInfo = await getCacheInfo(parsed.owner, parsed.repo, options.rootDir);
      cachePath = cacheInfo.cachePath;

      if (!cacheInfo.exists) {
        // Cache doesn't exist - create mirror cache
        await createCache({
          url: options.cloneUrl,
          owner: parsed.owner,
          repo: parsed.repo,
          rootDir: options.rootDir,
        });
      } else if (cacheInfo.isValid) {
        // Cache exists and is valid - update it
        await updateCache(cachePath);
      } else {
        // Cache is corrupted - remove and recreate
        await removeCache(cachePath);
        await createCache({
          url: options.cloneUrl,
          owner: parsed.owner,
          repo: parsed.repo,
          rootDir: options.rootDir,
        });
      }
    } catch {
      // Cache operation failed - fall back to direct clone
      useCache = false;
      cachePath = undefined;
      // Log warning but don't fail the operation
    }

    // 6. Execute git clone to target directory
    const git = simpleGit();
    if (useCache && cachePath) {
      // Clone with reference and dissociate for full independence
      await git.clone(options.cloneUrl, targetPath, ['--reference', cachePath, '--dissociate']);
    } else {
      // Direct clone (no cache)
      await git.clone(options.cloneUrl, targetPath);
    }

    // 7. Navigate into cloned repo
    const repoGit = simpleGit(targetPath);

    // 7a. Validate: If creating a new local branch, ensure it doesn't exist on remote
    if (options.baseBranch !== options.targetBranch) {
      const branchValidation = await validateRemoteBranchNotExists(repoGit, options.targetBranch);
      if (!branchValidation.valid) {
        throw new GCPBError(
          branchValidation.error || 'Remote branch validation failed',
          'Please use a different local branch name or delete the remote branch first'
        );
      }
    }

    // 8. Get the default branch name
    const defaultBranch = await getDefaultBranch(repoGit);

    // 9. Normalize remote branch name (remove origin/ prefix if present)
    const baseBranch = options.baseBranch.replace(/^origin\//, '');

    // 10. Handle branch checkout based on scenario
    if (baseBranch === options.targetBranch) {
      // Case: remote == local (working on existing branch)

      if (baseBranch === defaultBranch) {
        // Case A: Working on default branch
        // The default branch is already checked out after clone, nothing to do
      } else {
        // Case B: Working on non-default branch
        // Need to fetch and checkout the branch explicitly
        await repoGit.fetch('origin', baseBranch);
        await repoGit.checkout(baseBranch);
      }
    } else {
      // Case: remote != local (creating new local branch from remote)

      // Fetch remote branch if it's not the default
      if (baseBranch !== defaultBranch) {
        await repoGit.fetch('origin', baseBranch);
      }

      // Create new local branch from remote
      const checkoutRef = baseBranch === defaultBranch ? baseBranch : `origin/${baseBranch}`;
      await repoGit.checkoutBranch(options.targetBranch, checkoutRef);
    }

    return {
      success: true,
      targetPath,
    };
  } catch (error) {
    // Cleanup: Remove cloned directory if clone succeeded but later steps failed
    // BUT: Don't cleanup if validation failed (directory already existed)
    if (shouldCleanupOnError) {
      try {
        if (await fs.pathExists(targetPath)) {
          await fs.remove(targetPath);
        }
      } catch {
        // Ignore cleanup errors, prioritize original error
        // Cleanup failure shouldn't hide the actual error
      }
    }

    if (error instanceof GCPBError) {
      return {
        success: false,
        targetPath: '',
        error,
      };
    }

    // Handle git-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('already exists')) {
      return {
        success: false,
        targetPath: '',
        error: new GCPBError(
          'Directory already exists',
          'Please use a different branch name or remove the existing directory',
          error instanceof Error ? error : undefined
        ),
      };
    }

    if (
      errorMessage.toLowerCase().includes('authentication') ||
      errorMessage.toLowerCase().includes('permission denied')
    ) {
      return {
        success: false,
        targetPath: '',
        error: new GCPBError(
          'Authentication failed',
          'Please ensure your SSH key is configured or use HTTPS with credentials',
          error instanceof Error ? error : undefined
        ),
      };
    }

    if (
      errorMessage.toLowerCase().includes('not found') ||
      errorMessage.toLowerCase().includes('repository')
    ) {
      return {
        success: false,
        targetPath: '',
        error: new GCPBError(
          'Repository not found',
          'Please check the repository URL and your access permissions',
          error instanceof Error ? error : undefined
        ),
      };
    }

    if (errorMessage.toLowerCase().includes('branch')) {
      return {
        success: false,
        targetPath: '',
        error: new GCPBError(
          `Base branch "${options.baseBranch}" not found`,
          'Please check the branch name. Common branches: main, master, develop',
          error instanceof Error ? error : undefined
        ),
      };
    }

    return {
      success: false,
      targetPath: '',
      error: new GCPBError(
        'Failed to clone repository',
        'Please check the repository URL and your network connection',
        error instanceof Error ? error : undefined
      ),
    };
  }
}
