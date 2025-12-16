import fs from 'fs-extra';
import path from 'path';
import type { RepositoryInfo } from '../types/index.js';
import { GCPBError } from '../types/index.js';

const CONFIG_DIR = '.gcpb';

/**
 * Checks if a directory is a Git repository by verifying .git exists
 */
export async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    const gitPath = path.join(dirPath, '.git');
    const stat = await fs.stat(gitPath);
    return stat.isDirectory() || stat.isFile(); // .git can be a file in worktrees
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return false;
    }
    // For permission errors, assume it's not a valid repo
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      return false;
    }
    throw error;
  }
}

/**
 * Scans the root directory for cloned repositories
 * Returns array of RepositoryInfo with owner/repo/branches structure
 */
export async function scanRepositories(rootDir: string): Promise<RepositoryInfo[]> {
  try {
    const repositories: RepositoryInfo[] = [];

    // 1. Scan owner directories (${root}/*)
    const entries = await fs.readdir(rootDir);

    for (const owner of entries) {
      // Skip .gcpb directory
      if (owner === CONFIG_DIR) {
        continue;
      }

      const ownerPath = path.join(rootDir, owner);

      let ownerStat;
      try {
        ownerStat = await fs.stat(ownerPath);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'EACCES' || err.code === 'EPERM') {
          // Skip directories we can't access
          continue;
        }
        throw error;
      }

      if (!ownerStat.isDirectory()) {
        continue;
      }

      // 2. Scan repo directories (${root}/${owner}/*)
      const repoDirs = await fs.readdir(ownerPath);

      for (const repo of repoDirs) {
        const repoPath = path.join(ownerPath, repo);

        let repoStat;
        try {
          repoStat = await fs.stat(repoPath);
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          if (err.code === 'EACCES' || err.code === 'EPERM') {
            continue;
          }
          throw error;
        }

        if (!repoStat.isDirectory()) {
          continue;
        }

        // 3. Scan branch directories (${root}/${owner}/${repo}/*)
        const branchDirs = await fs.readdir(repoPath);
        const branches: string[] = [];

        for (const branch of branchDirs) {
          const branchPath = path.join(repoPath, branch);

          let branchStat;
          try {
            branchStat = await fs.stat(branchPath);
          } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err.code === 'EACCES' || err.code === 'EPERM') {
              continue;
            }
            throw error;
          }

          // Check if it's a directory and contains .git
          if (branchStat.isDirectory() && (await isGitRepository(branchPath))) {
            branches.push(branch);
          }
        }

        if (branches.length > 0) {
          repositories.push({
            owner,
            repo,
            branches,
            fullPath: repoPath,
          });
        }
      }
    }

    return repositories;
  } catch (error) {
    throw new GCPBError(
      'Failed to scan repositories',
      'Please check file system permissions',
      error instanceof Error ? error : undefined
    );
  }
}
