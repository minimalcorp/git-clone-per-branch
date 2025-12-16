import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import type { CloneOptions, CloneResult } from '../types/index.js';
import { GCPBError } from '../types/index.js';
import { parseGitUrl } from './url-parser.js';
import { validateTargetPath } from '../utils/validators.js';

export async function cloneRepository(options: CloneOptions): Promise<CloneResult> {
  try {
    // 1. Parse git URL to get owner and repo
    const parsed = parseGitUrl(options.cloneUrl);

    // 2. Construct target path: ${rootDir}/${owner}/${repo}/${targetBranch}
    const targetPath = path.join(options.rootDir, parsed.owner, parsed.repo, options.targetBranch);

    // 3. Check if target directory exists (fail early)
    const pathValidation = await validateTargetPath(targetPath);
    if (!pathValidation.valid) {
      throw new GCPBError(
        pathValidation.error || 'Target directory validation failed',
        'Please use a different branch name or remove the existing directory'
      );
    }

    // 4. Create parent directories if needed
    await fs.ensureDir(path.dirname(targetPath));

    // 5. Execute git clone to target directory
    const git = simpleGit();
    await git.clone(options.cloneUrl, targetPath, ['--single-branch']);

    // 6. Navigate into cloned repo
    const repoGit = simpleGit(targetPath);

    // 7. Fetch base branch if it's a remote reference
    const baseBranch = options.baseBranch.replace(/^origin\//, '');

    // Check if we need to fetch the base branch
    if (options.baseBranch.startsWith('origin/')) {
      await repoGit.fetch('origin', baseBranch);
    }

    // 8. Create new branch only if target branch is different from base branch
    // If they are the same (e.g., working on default branch), skip branch creation
    // as the branch is already checked out after clone
    if (baseBranch !== options.targetBranch) {
      const checkoutRef = options.baseBranch.startsWith('origin/')
        ? options.baseBranch
        : baseBranch;

      await repoGit.checkoutBranch(options.targetBranch, checkoutRef);
    }

    return {
      success: true,
      targetPath,
    };
  } catch (error) {
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
