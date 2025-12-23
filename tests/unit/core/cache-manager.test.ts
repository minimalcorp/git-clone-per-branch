import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  getCachePath,
  validateCache,
  getCacheInfo,
  createCache,
  updateCache,
  removeCache,
} from '../../../src/core/cache-manager.js';
import fs from 'fs-extra';
import simpleGit from 'simple-git';

vi.mock('fs-extra');
vi.mock('simple-git');

describe('cache-manager', () => {
  const mockGit = {
    revparse: vi.fn(),
    raw: vi.fn(),
    clone: vi.fn(),
    fetch: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(simpleGit).mockReturnValue(mockGit as any);
  });

  describe('getCachePath', () => {
    test('should return correct cache path', () => {
      const result = getCachePath('/workspace', 'owner', 'repo');
      expect(result).toBe('/workspace/.gcpb/.cache/owner/repo');
    });
  });

  describe('validateCache', () => {
    test('should return false if cache directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await validateCache('/cache/path');

      expect(result).toBe(false);
      expect(fs.pathExists).toHaveBeenCalledWith('/cache/path');
    });

    test('should return false if not a bare repository', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      mockGit.revparse.mockResolvedValue('false\n');

      const result = await validateCache('/cache/path');

      expect(result).toBe(false);
      expect(mockGit.revparse).toHaveBeenCalledWith(['--is-bare-repository']);
    });

    test('should return true if cache is valid', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      mockGit.revparse.mockResolvedValue('true\n');
      mockGit.raw.mockResolvedValue('HEAD refs/heads/main\n');

      const result = await validateCache('/cache/path');

      expect(result).toBe(true);
      expect(mockGit.revparse).toHaveBeenCalledWith(['--is-bare-repository']);
      expect(mockGit.raw).toHaveBeenCalledWith(['show-ref', '--head']);
    });

    test('should return false if show-ref fails', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      mockGit.revparse.mockResolvedValue('true\n');
      mockGit.raw.mockRejectedValue(new Error('show-ref failed'));

      const result = await validateCache('/cache/path');

      expect(result).toBe(false);
    });
  });

  describe('getCacheInfo', () => {
    test('should return non-existent cache info when cache does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await getCacheInfo('owner', 'repo', '/workspace');

      expect(result).toEqual({
        cachePath: '/workspace/.gcpb/.cache/owner/repo',
        exists: false,
        isValid: false,
      });
    });

    test('should return invalid cache info when cache is corrupted', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      mockGit.revparse.mockResolvedValue('false\n');

      const result = await getCacheInfo('owner', 'repo', '/workspace');

      expect(result).toEqual({
        cachePath: '/workspace/.gcpb/.cache/owner/repo',
        exists: true,
        isValid: false,
      });
    });

    test('should return valid cache info when cache is valid', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      mockGit.revparse.mockResolvedValue('true\n');
      mockGit.raw.mockResolvedValue('HEAD refs/heads/main\n');

      const result = await getCacheInfo('owner', 'repo', '/workspace');

      expect(result).toEqual({
        cachePath: '/workspace/.gcpb/.cache/owner/repo',
        exists: true,
        isValid: true,
      });
    });
  });

  describe('createCache', () => {
    test('should create mirror cache', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      mockGit.clone.mockResolvedValue(undefined);

      await createCache({
        url: 'https://github.com/owner/repo.git',
        owner: 'owner',
        repo: 'repo',
        rootDir: '/workspace',
      });

      expect(fs.ensureDir).toHaveBeenCalledWith('/workspace/.gcpb/.cache/owner');
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/owner/repo.git',
        '/workspace/.gcpb/.cache/owner/repo',
        ['--mirror']
      );
    });
  });

  describe('updateCache', () => {
    test('should fetch with prune and tags', async () => {
      mockGit.fetch.mockResolvedValue(undefined);

      await updateCache('/cache/path');

      expect(mockGit.fetch).toHaveBeenCalledWith(['--prune', '--tags']);
    });
  });

  describe('removeCache', () => {
    test('should remove cache directory if it exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      await removeCache('/cache/path');

      expect(fs.pathExists).toHaveBeenCalledWith('/cache/path');
      expect(fs.remove).toHaveBeenCalledWith('/cache/path');
    });

    test('should do nothing if cache does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await removeCache('/cache/path');

      expect(fs.pathExists).toHaveBeenCalledWith('/cache/path');
      expect(fs.remove).not.toHaveBeenCalled();
    });
  });
});
