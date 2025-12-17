import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import type { RemoteUrlResult } from '../types/index.js';
import { isGitRepository } from './repository-scanner.js';

/**
 * Resolves the remote URL from existing branches of a repository
 * Scans branch directories and attempts to get the remote URL from .git
 */
export async function resolveRemoteUrl(
  rootDir: string,
  owner: string,
  repo: string
): Promise<RemoteUrlResult> {
  const repoPath = path.join(rootDir, owner, repo);

  // Check if repo directory exists
  const exists = await fs.pathExists(repoPath);
  if (!exists) {
    return { found: false };
  }

  // Enumerate branch directories
  let branches: string[];
  try {
    branches = await fs.readdir(repoPath);
  } catch {
    return { found: false };
  }

  // Try each branch to find a valid remote URL
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

    // Try to get remote URL using simple-git
    try {
      const git = simpleGit(branchPath);
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((r) => r.name === 'origin');

      if (origin && origin.refs && origin.refs.fetch) {
        return {
          found: true,
          url: origin.refs.fetch,
          source: branch,
        };
      }
    } catch {
      // Error getting remotes from this branch, try next one
      continue;
    }
  }

  // No valid remote URL found in any branch
  return { found: false };
}
