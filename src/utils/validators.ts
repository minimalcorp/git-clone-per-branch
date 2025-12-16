import { execSync } from 'child_process';
import fs from 'fs-extra';
import type { SimpleGit } from 'simple-git';
import type { ValidationResult } from '../types/index.js';

export function validateGitUrl(url: string): ValidationResult {
  // Check for common git URL patterns
  const httpsPattern = /^https?:\/\/.+\/.+\/.+/;
  const sshPattern = /^git@.+:.+\/.+/;
  const gitPattern = /^git:\/\/.+\/.+\/.+/;

  if (!httpsPattern.test(url) && !sshPattern.test(url) && !gitPattern.test(url)) {
    return {
      valid: false,
      error:
        'Invalid Git URL format. Expected format: https://github.com/user/repo.git or git@github.com:user/repo.git',
    };
  }

  return { valid: true };
}

export function validateBranchName(branch: string): ValidationResult {
  if (!branch || branch.trim().length === 0) {
    return { valid: false, error: 'Branch name cannot be empty' };
  }

  // Git branch name restrictions
  const invalidPatterns = [
    /\.\./, // no consecutive dots
    /^[/.]/, // cannot start with / or .
    /\/$/, // cannot end with /
    /\.lock$/, // cannot end with .lock
    /@\{/, // no @{
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1F\x7F]/, // no control characters
    // eslint-disable-next-line no-useless-escape
    /[ ~^:?*\[\\]/, // no special characters
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(branch)) {
      return {
        valid: false,
        error: `Invalid branch name "${branch}". Branch names cannot contain special characters or patterns like "..", "@{", etc.`,
      };
    }
  }

  return { valid: true };
}

export async function validateTargetPath(path: string): Promise<ValidationResult> {
  try {
    const exists = await fs.pathExists(path);
    if (exists) {
      return {
        valid: false,
        error: `Directory already exists at ${path}. Please use a different branch name or remove the existing directory.`,
      };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to check target path: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export function checkGitInstalled(): ValidationResult {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return { valid: true };
  } catch {
    return {
      valid: false,
      error:
        'Git is not installed or not in PATH. Please install Git from https://git-scm.com/downloads',
    };
  }
}

/**
 * Sanitize branch name for use as directory name
 * Replaces forward slashes with hyphens to avoid nested directories
 *
 * @param branchName - Git branch name (e.g., "feat/xxx", "main")
 * @returns Sanitized directory name (e.g., "feat-xxx", "main")
 *
 * @example
 * sanitizeBranchName("feat/xxx") // returns "feat-xxx"
 * sanitizeBranchName("main") // returns "main"
 * sanitizeBranchName("feature/login/auth") // returns "feature-login-auth"
 */
export function sanitizeBranchName(branchName: string): string {
  return branchName.replace(/\//g, '-');
}

/**
 * Validate that a branch name doesn't exist on remote
 * Used when creating a new local branch from a different remote branch
 * to prevent conflicts when pushing
 *
 * @param git - SimpleGit instance for the cloned repository
 * @param branchName - Local branch name to check
 * @returns ValidationResult indicating if the branch name is safe to use
 *
 * @example
 * const result = await validateRemoteBranchNotExists(repoGit, "test");
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */
export async function validateRemoteBranchNotExists(
  git: SimpleGit,
  branchName: string
): Promise<ValidationResult> {
  try {
    const branchSummary = await git.branch();
    const remoteBranches = branchSummary.all.filter((b) => b.startsWith('remotes/origin/'));
    const fullRemoteName = `remotes/origin/${branchName}`;

    if (remoteBranches.includes(fullRemoteName)) {
      return {
        valid: false,
        error: `Remote branch "${branchName}" already exists. Cannot create a new local branch with the same name.`,
      };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to check remote branches: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
