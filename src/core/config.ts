import fs from 'fs-extra';
import path from 'path';
import type { Config, EditorPreferences } from '../types/index.js';
import { GCPBError } from '../types/index.js';

const CONFIG_DIR = '.gcpb';
const CONFIG_FILE = 'settings.json';

/**
 * Searches upward from startDir to find .gcpb directory
 * Returns absolute path to directory containing .gcpb, or null if not found
 */
export async function findRoot(startDir: string = process.cwd()): Promise<string | null> {
  try {
    // Resolve symlinks
    let currentDir = await fs.realpath(startDir);

    while (true) {
      const gcpbPath = path.join(currentDir, CONFIG_DIR);

      try {
        const stat = await fs.stat(gcpbPath);
        if (stat.isDirectory()) {
          return currentDir; // Found .gcpb directory
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
          // Directory doesn't exist, continue to parent
        } else if (err.code === 'EACCES' || err.code === 'EPERM') {
          // Permission denied, skip to parent
        } else {
          throw error;
        }
      }

      // Move to parent directory
      const parentDir = path.dirname(currentDir);

      // Check if we reached filesystem root
      if (currentDir === parentDir) {
        return null;
      }

      currentDir = parentDir;
    }
  } catch (error) {
    throw new GCPBError(
      'Failed to search for .gcpb directory',
      'Please check file system permissions',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Initializes .gcpb/settings.json in targetDir
 * Returns the root directory path
 */
export async function initializeConfig(targetDir: string = process.cwd()): Promise<string> {
  try {
    const gcpbPath = path.join(targetDir, CONFIG_DIR);
    const configPath = path.join(gcpbPath, CONFIG_FILE);

    // Check if .gcpb already exists
    const exists = await fs.pathExists(gcpbPath);
    if (exists) {
      throw new GCPBError(
        '.gcpb directory already exists',
        `Remove ${gcpbPath} if you want to reinitialize`
      );
    }

    // Create .gcpb directory
    await fs.ensureDir(gcpbPath);

    // Create settings.json
    const config: Config = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
    };

    await fs.writeJson(configPath, config, { spaces: 2 });

    return targetDir;
  } catch (error) {
    if (error instanceof GCPBError) {
      throw error;
    }
    throw new GCPBError(
      'Failed to initialize configuration',
      'Please check write permissions for the current directory',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Loads and validates settings from root directory
 */
export async function loadConfig(rootDir: string): Promise<Config> {
  try {
    const configPath = path.join(rootDir, CONFIG_DIR, CONFIG_FILE);

    const config = (await fs.readJson(configPath)) as Config;

    // Validate config structure
    if (!config.version) {
      throw new GCPBError(
        'Invalid configuration file',
        `Config at ${configPath} is missing version field`
      );
    }

    return config;
  } catch (error) {
    if (error instanceof GCPBError) {
      throw error;
    }
    throw new GCPBError(
      'Failed to load configuration',
      'Run "gcpb init" to initialize configuration',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Saves the configuration to settings.json
 */
export async function saveConfig(rootDir: string, config: Config): Promise<void> {
  try {
    const configPath = path.join(rootDir, CONFIG_DIR, CONFIG_FILE);
    await fs.writeJson(configPath, config, { spaces: 2 });
  } catch (error) {
    throw new GCPBError(
      'Failed to save configuration',
      'Please check write permissions for the .gcpb directory',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Updates editor preferences in the configuration
 */
export async function updateEditorPreferences(
  rootDir: string,
  preferences: EditorPreferences
): Promise<void> {
  try {
    const config = await loadConfig(rootDir);
    config.editor = preferences;
    await saveConfig(rootDir, config);
  } catch (error) {
    if (error instanceof GCPBError) {
      throw error;
    }
    throw new GCPBError(
      'Failed to update editor preferences',
      'Please check your configuration file',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Removes empty directories recursively from root
 * Cleans up owner/repo directories that become empty after removing branches
 */
export async function cleanupEmptyDirectories(rootDir: string): Promise<void> {
  try {
    const entries = await fs.readdir(rootDir);

    for (const owner of entries) {
      // Skip .gcpb directory
      if (owner === CONFIG_DIR) {
        continue;
      }

      const ownerPath = path.join(rootDir, owner);
      const ownerStat = await fs.stat(ownerPath);

      if (!ownerStat.isDirectory()) {
        continue;
      }

      // Check repo directories
      const repos = await fs.readdir(ownerPath);

      for (const repo of repos) {
        const repoPath = path.join(ownerPath, repo);
        const repoStat = await fs.stat(repoPath);

        if (!repoStat.isDirectory()) {
          continue;
        }

        // Check if repo directory is empty
        const branches = await fs.readdir(repoPath);
        if (branches.length === 0) {
          // Remove empty repo directory
          await fs.remove(repoPath);
        }
      }

      // Check if owner directory is empty
      const remainingRepos = await fs.readdir(ownerPath);
      if (remainingRepos.length === 0) {
        // Remove empty owner directory
        await fs.remove(ownerPath);
      }
    }
  } catch (error) {
    // Don't throw error on cleanup failure, just log it
    console.warn('Warning: Failed to cleanup empty directories:', error);
  }
}
