import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { isGitRepository } from './repository-scanner.js';

/**
 * Get the default branch from a remote repository using git ls-remote
 * This works before cloning the repository
 */
async function getRemoteDefaultBranch(url: string): Promise<string | null> {
  try {
    const git = simpleGit();
    const result = await git.listRemote(['--symref', url, 'HEAD']);

    // Output format: "ref: refs/heads/main\tHEAD"
    // Extract the branch name from the first line
    const match = result.match(/ref: refs\/heads\/(\S+)/);
    return match ? match[1] : null;
  } catch {
    // Network error, invalid URL, or other issues
    return null;
  }
}

/**
 * Get the default branch from an existing cloned branch of the same repository
 * This is faster than ls-remote if we already have the repo cloned
 */
async function getDefaultBranchFromExisting(
  rootDir: string,
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    const repoPath = path.join(rootDir, owner, repo);

    // Check if repo directory exists
    const exists = await fs.pathExists(repoPath);
    if (!exists) {
      return null;
    }

    // Enumerate branch directories
    const branches = await fs.readdir(repoPath);

    // Try each branch to find a valid git repository
    for (const branch of branches) {
      const branchPath = path.join(repoPath, branch);

      // Check if it's a directory
      let stat;
      try {
        stat = await fs.stat(branchPath);
      } catch {
        continue;
      }

      if (!stat.isDirectory()) {
        continue;
      }

      // Check if it's a git repository
      const isGit = await isGitRepository(branchPath);
      if (!isGit) {
        continue;
      }

      // Get default branch using git revparse
      try {
        const git = simpleGit(branchPath);
        const result = await git.revparse(['--abbrev-ref', 'origin/HEAD']);
        // Result format: "origin/main" -> extract "main"
        return result.replace('origin/', '').trim();
      } catch {
        // This branch doesn't have origin/HEAD set, try next one
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect the default branch for a repository
 *
 * Strategy:
 * 1. Try to get from existing cloned branches (fast)
 * 2. Fall back to git ls-remote (reliable)
 * 3. Fall back to 'main' (safe default)
 *
 * @param url - The git repository URL
 * @param rootDir - The root directory where repositories are cloned
 * @param owner - Optional owner/organization name
 * @param repo - Optional repository name
 * @returns The default branch name (e.g., 'main', 'develop', 'master')
 */
export async function detectDefaultBranch(
  url: string,
  rootDir: string,
  owner?: string,
  repo?: string
): Promise<string> {
  // 1. Try to get from existing cloned branches
  if (owner && repo) {
    const fromExisting = await getDefaultBranchFromExisting(rootDir, owner, repo);
    if (fromExisting) {
      return fromExisting;
    }
  }

  // 2. Try git ls-remote
  const fromRemote = await getRemoteDefaultBranch(url);
  if (fromRemote) {
    return fromRemote;
  }

  // 3. Fall back to 'main'
  return 'main';
}
