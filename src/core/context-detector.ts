import fs from 'fs-extra';
import path from 'path';
import type { ContextInfo } from '../types/index.js';

const CONFIG_DIR = '.gcpb';

/**
 * Detects the current directory context within the gcpb structure
 * Determines if we're in root, owner, repo, or branch directory
 */
export async function detectContext(rootDir: string, currentDir: string): Promise<ContextInfo> {
  try {
    // Calculate relative path from root to current directory
    const relativePath = path.relative(rootDir, currentDir);

    // Check if we're outside the gcpb structure
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return { location: 'outside' };
    }

    // Check if we're at root
    if (relativePath === '' || relativePath === '.') {
      // Enumerate owners at root level
      const entries = await fs.readdir(rootDir);
      const availableOwners: string[] = [];

      for (const entry of entries) {
        // Skip .gcpb directory
        if (entry === CONFIG_DIR) {
          continue;
        }

        const entryPath = path.join(rootDir, entry);

        try {
          const stat = await fs.stat(entryPath);
          if (stat.isDirectory()) {
            // Check if this owner has any repos
            const repos = await fs.readdir(entryPath);
            if (repos.length > 0) {
              availableOwners.push(entry);
            }
          }
        } catch (error) {
          // Skip directories we can't access
          const err = error as NodeJS.ErrnoException;
          if (err.code === 'EACCES' || err.code === 'EPERM') {
            continue;
          }
          // Re-throw other errors
          throw error;
        }
      }

      return {
        location: 'root',
        availableOwners: availableOwners.length > 0 ? availableOwners : undefined,
      };
    }

    // Split path to determine hierarchy level
    const parts = relativePath.split(path.sep);

    // Owner level (1 level deep)
    if (parts.length === 1) {
      const owner = parts[0];
      const ownerPath = path.join(rootDir, owner);

      // Enumerate repos under this owner
      const repos = await fs.readdir(ownerPath);
      const availableRepos: string[] = [];

      for (const repo of repos) {
        const repoPath = path.join(ownerPath, repo);

        try {
          const stat = await fs.stat(repoPath);
          if (stat.isDirectory()) {
            // Check if this repo has any branches
            const branches = await fs.readdir(repoPath);
            if (branches.length > 0) {
              availableRepos.push(repo);
            }
          }
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          if (err.code === 'EACCES' || err.code === 'EPERM') {
            continue;
          }
          throw error;
        }
      }

      return {
        location: 'owner',
        owner,
        availableRepos: availableRepos.length > 0 ? availableRepos : undefined,
      };
    }

    // Repo level (2 levels deep)
    if (parts.length === 2) {
      return {
        location: 'repo',
        owner: parts[0],
        repo: parts[1],
      };
    }

    // Branch level (3+ levels deep)
    if (parts.length >= 3) {
      return {
        location: 'branch',
        owner: parts[0],
        repo: parts[1],
      };
    }

    return { location: 'outside' };
  } catch {
    // On any error, fall back to outside
    return { location: 'outside' };
  }
}
