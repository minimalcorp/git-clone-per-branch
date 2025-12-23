import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  scanCachedRepositories,
  getCacheUrl,
  getCachedOwners,
  getCachedRepos,
} from '../../../src/core/cache-scanner.js';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { validateCache } from '../../../src/core/cache-manager.js';

vi.mock('fs-extra');
vi.mock('simple-git');
vi.mock('../../../src/core/cache-manager.js');

describe('cache-scanner', () => {
  const mockGit = {
    getRemotes: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(simpleGit).mockReturnValue(mockGit as any);
  });

  describe('getCacheUrl', () => {
    test('should extract URL from cache git config', async () => {
      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: {
            fetch: 'https://github.com/owner/repo.git',
            push: 'https://github.com/owner/repo.git',
          },
        },
      ]);

      const url = await getCacheUrl('/cache/path');

      expect(url).toBe('https://github.com/owner/repo.git');
      expect(mockGit.getRemotes).toHaveBeenCalledWith(true);
    });

    test('should throw error if no origin remote found', async () => {
      mockGit.getRemotes.mockResolvedValue([]);

      await expect(getCacheUrl('/cache/path')).rejects.toThrow('No origin remote found in cache');
    });

    test('should throw error if origin has no fetch ref', async () => {
      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: {},
        },
      ]);

      await expect(getCacheUrl('/cache/path')).rejects.toThrow('No origin remote found in cache');
    });
  });

  describe('getCachedOwners', () => {
    test('should return empty array if cache directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await getCachedOwners('/root');

      expect(result).toEqual([]);
    });

    test('should return owners with valid cached repos', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValueOnce(['owner1', 'owner2'] as any);

      // Mock getCachedRepos calls
      vi.mocked(fs.readdir).mockResolvedValueOnce(['repo1'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(validateCache).mockResolvedValue(true);

      vi.mocked(fs.readdir).mockResolvedValueOnce(['repo2'] as any);

      const result = await getCachedOwners('/root');

      expect(result).toEqual(['owner1', 'owner2']);
    });

    test('should filter out owners with no valid repos', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValueOnce(['owner1', 'owner2'] as any);

      // owner1 has valid repos
      vi.mocked(fs.readdir).mockResolvedValueOnce(['repo1'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(validateCache).mockResolvedValue(true);

      // owner2 has no valid repos
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);

      const result = await getCachedOwners('/root');

      expect(result).toEqual(['owner1']);
    });

    test('should handle errors gracefully', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Read error'));

      const result = await getCachedOwners('/root');

      expect(result).toEqual([]);
    });
  });

  describe('getCachedRepos', () => {
    test('should return empty array if owner path does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await getCachedRepos('/root', 'owner1');

      expect(result).toEqual([]);
    });

    test('should return valid cached repos', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['repo1', 'repo2', 'repo3'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      // repo1 and repo2 are valid, repo3 is invalid
      vi.mocked(validateCache)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await getCachedRepos('/root', 'owner1');

      expect(result).toEqual(['repo1', 'repo2']);
    });

    test('should filter out non-directory entries', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['repo1', 'file.txt'] as any);
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ isDirectory: () => true } as any)
        .mockResolvedValueOnce({ isDirectory: () => false } as any);
      vi.mocked(validateCache).mockResolvedValue(true);

      const result = await getCachedRepos('/root', 'owner1');

      expect(result).toEqual(['repo1']);
    });

    test('should handle errors gracefully', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Read error'));

      const result = await getCachedRepos('/root', 'owner1');

      expect(result).toEqual([]);
    });
  });

  describe('scanCachedRepositories', () => {
    test('should return empty array if cache root does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await scanCachedRepositories('/root');

      expect(result).toEqual([]);
    });

    test('should scan and return all valid cached repositories', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);

      // Mock cache structure
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any) // owners
        .mockResolvedValueOnce(['repo1', 'repo2'] as any); // repos

      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      vi.mocked(validateCache).mockResolvedValue(true);

      mockGit.getRemotes
        .mockResolvedValueOnce([
          {
            name: 'origin',
            refs: { fetch: 'https://github.com/owner1/repo1.git' },
          },
        ])
        .mockResolvedValueOnce([
          {
            name: 'origin',
            refs: { fetch: 'https://github.com/owner1/repo2.git' },
          },
        ]);

      const result = await scanCachedRepositories('/root');

      expect(result).toEqual([
        {
          owner: 'owner1',
          repo: 'repo1',
          cachePath: '/root/.gcpb/.cache/owner1/repo1',
          url: 'https://github.com/owner1/repo1.git',
        },
        {
          owner: 'owner1',
          repo: 'repo2',
          cachePath: '/root/.gcpb/.cache/owner1/repo2',
          url: 'https://github.com/owner1/repo2.git',
        },
      ]);
    });

    test('should skip invalid caches', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);

      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['repo1', 'repo2'] as any);

      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      // repo1 is valid, repo2 is invalid
      vi.mocked(validateCache).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: { fetch: 'https://github.com/owner1/repo1.git' },
        },
      ]);

      const result = await scanCachedRepositories('/root');

      expect(result).toHaveLength(1);
      expect(result[0].repo).toBe('repo1');
    });

    test('should skip repos with no URL', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);

      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any);

      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(validateCache).mockResolvedValue(true);

      // No origin remote
      mockGit.getRemotes.mockResolvedValue([]);

      const result = await scanCachedRepositories('/root');

      expect(result).toEqual([]);
    });

    test('should handle errors gracefully', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Read error'));

      const result = await scanCachedRepositories('/root');

      expect(result).toEqual([]);
    });
  });
});
