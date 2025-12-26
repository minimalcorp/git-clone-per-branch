import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import type { CacheInfo, CacheOptions } from '../types/index.js';

const CONFIG_DIR = '.gcpb';
const CACHE_DIR = '.cache';

/**
 * Get the cache directory path for a repository
 */
export function getCachePath(rootDir: string, owner: string, repo: string): string {
  return path.join(rootDir, CONFIG_DIR, CACHE_DIR, owner, repo);
}

/**
 * Validate cache integrity - checks if it's a valid bare git repository
 */
export async function validateCache(cachePath: string): Promise<boolean> {
  try {
    // Check if directory exists
    if (!(await fs.pathExists(cachePath))) {
      return false;
    }

    // Check if it's a git repository
    const git = simpleGit({ baseDir: cachePath });

    // Check if it's a bare repository
    const isBare = await git.revparse(['--is-bare-repository']);
    if (isBare.trim() !== 'true') {
      return false;
    }

    // Check if HEAD exists (basic sanity check)
    await git.raw(['show-ref', '--head']);

    return true;
  } catch {
    // Any error means cache is invalid
    return false;
  }
}

/**
 * Get cache information for a repository
 */
export async function getCacheInfo(
  owner: string,
  repo: string,
  rootDir: string
): Promise<CacheInfo> {
  const cachePath = getCachePath(rootDir, owner, repo);
  const exists = await fs.pathExists(cachePath);

  if (!exists) {
    return {
      cachePath,
      exists: false,
      isValid: false,
    };
  }

  const isValid = await validateCache(cachePath);

  return {
    cachePath,
    exists: true,
    isValid,
  };
}

/**
 * Create a new mirror cache for a repository
 */
export async function createCache(options: CacheOptions): Promise<void> {
  const cachePath = getCachePath(options.rootDir, options.owner, options.repo);

  // Ensure parent directory exists
  await fs.ensureDir(path.dirname(cachePath));

  // Create mirror clone
  const git = simpleGit();
  await git.clone(options.url, cachePath, ['--mirror']);
}

/**
 * Update an existing cache with latest refs
 */
export async function updateCache(cachePath: string): Promise<void> {
  const git = simpleGit({ baseDir: cachePath });

  // Fetch all refs from origin with prune to remove deleted branches and tags
  // --prune: Remove remote-tracking refs that no longer exist on remote
  // --prune-tags: Remove local tags that no longer exist on remote
  // For mirror repositories, this ensures the cache stays in sync with the remote
  await git.fetch(['origin', '--prune', '--prune-tags']);
}

/**
 * Delete corrupted cache
 */
export async function removeCache(cachePath: string): Promise<void> {
  if (await fs.pathExists(cachePath)) {
    await fs.remove(cachePath);
  }
}
