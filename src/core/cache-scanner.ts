import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { validateCache } from './cache-manager.js';

const CONFIG_DIR = '.gcpb';
const CACHE_DIR = '.cache';

export interface CachedRepository {
  owner: string;
  repo: string;
  cachePath: string;
  url: string;
}

/**
 * Scan cache directory to find all cached repositories
 */
export async function scanCachedRepositories(rootDir: string): Promise<CachedRepository[]> {
  const cacheRoot = path.join(rootDir, CONFIG_DIR, CACHE_DIR);

  if (!(await fs.pathExists(cacheRoot))) {
    return [];
  }

  const repositories: CachedRepository[] = [];

  try {
    // Read owner directories
    const owners = await fs.readdir(cacheRoot);

    for (const owner of owners) {
      const ownerPath = path.join(cacheRoot, owner);

      try {
        const stat = await fs.stat(ownerPath);

        if (!stat.isDirectory()) {
          continue;
        }

        // Read repo directories under owner
        const repos = await fs.readdir(ownerPath);

        for (const repo of repos) {
          const cachePath = path.join(ownerPath, repo);

          try {
            const repoStat = await fs.stat(cachePath);

            if (!repoStat.isDirectory()) {
              continue;
            }

            // Validate cache
            const isValid = await validateCache(cachePath);
            if (!isValid) {
              continue;
            }

            // Extract URL from cache
            try {
              const url = await getCacheUrl(cachePath);
              repositories.push({ owner, repo, cachePath, url });
            } catch {
              // Skip if we can't get URL
              continue;
            }
          } catch {
            // Skip if we can't stat repo
            continue;
          }
        }
      } catch {
        // Skip if we can't read owner directory
        continue;
      }
    }
  } catch {
    // Return empty array if we can't read cache root
    return [];
  }

  return repositories;
}

/**
 * Get repository URL from cache
 */
export async function getCacheUrl(cachePath: string): Promise<string> {
  const git = simpleGit({ baseDir: cachePath });

  // Get remote URL from origin
  const remotes = await git.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');

  if (!origin || !origin.refs || !origin.refs.fetch) {
    throw new Error('No origin remote found in cache');
  }

  return origin.refs.fetch;
}

/**
 * Get available owners from cache
 */
export async function getCachedOwners(rootDir: string): Promise<string[]> {
  const cacheRoot = path.join(rootDir, CONFIG_DIR, CACHE_DIR);

  if (!(await fs.pathExists(cacheRoot))) {
    return [];
  }

  const owners: string[] = [];

  try {
    const entries = await fs.readdir(cacheRoot);

    for (const entry of entries) {
      const entryPath = path.join(cacheRoot, entry);

      try {
        const stat = await fs.stat(entryPath);

        if (stat.isDirectory()) {
          // Check if owner has any valid cached repos
          const repos = await getCachedRepos(rootDir, entry);
          if (repos.length > 0) {
            owners.push(entry);
          }
        }
      } catch {
        // Skip if we can't stat entry
        continue;
      }
    }
  } catch {
    // Return empty array if we can't read cache root
    return [];
  }

  return owners;
}

/**
 * Get available repos for an owner from cache
 */
export async function getCachedRepos(rootDir: string, owner: string): Promise<string[]> {
  const ownerPath = path.join(rootDir, CONFIG_DIR, CACHE_DIR, owner);

  if (!(await fs.pathExists(ownerPath))) {
    return [];
  }

  const repos: string[] = [];

  try {
    const entries = await fs.readdir(ownerPath);

    for (const entry of entries) {
      const cachePath = path.join(ownerPath, entry);

      try {
        const stat = await fs.stat(cachePath);

        if (stat.isDirectory()) {
          // Validate cache
          const isValid = await validateCache(cachePath);
          if (isValid) {
            repos.push(entry);
          }
        }
      } catch {
        // Skip if we can't stat entry
        continue;
      }
    }
  } catch {
    // Return empty array if we can't read owner path
    return [];
  }

  return repos;
}
