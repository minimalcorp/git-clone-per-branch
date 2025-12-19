import { describe, test, expect, vi, beforeEach } from 'vitest';
import { cloneRepository } from '../../src/core/clone.js';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { createMockGit } from '../helpers/mock-git.js';
import { GCPBError } from '../../src/types/index.js';

vi.mock('fs-extra');
vi.mock('simple-git');

// Note: This is an integration test that uses real parseGitUrl and validators
// Only fs-extra and simple-git are mocked

describe('clone (integration)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('successful clones', () => {
    test('should clone when remote == local, default branch', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);

      const mockGit = createMockGit({
        clone: vi.fn().mockResolvedValue(undefined),
        revparse: vi.fn().mockResolvedValue('origin/main'),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await cloneRepository({
        cloneUrl: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'main',
        rootDir: '/test/root',
      });

      expect(result.success).toBe(true);
      expect(result.targetPath).toBe('/test/root/user/repo/main');
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/test/root/user/repo/main'
      );
    });

    test('should clone when remote != local, default branch', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);

      const mockGit = createMockGit({
        clone: vi.fn().mockResolvedValue(undefined),
        revparse: vi.fn().mockResolvedValue('origin/main'),
        branch: vi.fn().mockResolvedValue({
          all: ['main'],
          branches: {},
          current: 'main',
          detached: false,
        }),
        checkoutBranch: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await cloneRepository({
        cloneUrl: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'feature-xxx',
        rootDir: '/test/root',
      });

      expect(result.success).toBe(true);
      expect(result.targetPath).toBe('/test/root/user/repo/feature-xxx');
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/test/root/user/repo/feature-xxx'
      );
      expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feature-xxx', 'main');
    });

    test('should clone when remote == local, non-default branch', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);

      const mockGit = createMockGit({
        clone: vi.fn().mockResolvedValue(undefined),
        revparse: vi.fn().mockResolvedValue('origin/main'),
        fetch: vi.fn().mockResolvedValue(undefined),
        checkout: vi.fn().mockResolvedValue(''),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await cloneRepository({
        cloneUrl: 'https://github.com/user/repo.git',
        baseBranch: 'develop',
        targetBranch: 'develop',
        rootDir: '/test/root',
      });

      expect(result.success).toBe(true);
      expect(result.targetPath).toBe('/test/root/user/repo/develop');
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/test/root/user/repo/develop'
      );
      expect(mockGit.fetch).toHaveBeenCalledWith('origin', 'develop');
      expect(mockGit.checkout).toHaveBeenCalledWith('develop');
    });
  });

  describe('error cases', () => {
    test('should return error when target path already exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const result = await cloneRepository({
        cloneUrl: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'main',
        rootDir: '/test/root',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(GCPBError);
      expect(result.error?.message).toContain('already exists');
      // IMPORTANT: Should not remove the existing directory
      expect(fs.remove).not.toHaveBeenCalled();
    });

    test('should return error when clone fails', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const mockGit = createMockGit({
        clone: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await cloneRepository({
        cloneUrl: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'main',
        rootDir: '/test/root',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(GCPBError);
      expect(result.error?.message).toContain('Failed to clone repository');
    });

    test('should return error when checkout fails', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const mockGit = createMockGit({
        clone: vi.fn().mockResolvedValue(undefined),
        revparse: vi.fn().mockResolvedValue('origin/main'),
        branch: vi.fn().mockResolvedValue({
          all: ['main'],
          branches: {},
          current: 'main',
          detached: false,
        }),
        checkoutBranch: vi.fn().mockRejectedValue(new Error('Checkout error')),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await cloneRepository({
        cloneUrl: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'feature-xxx',
        rootDir: '/test/root',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(GCPBError);
    });
  });

  describe('sanitization', () => {
    test('should sanitize branch name with slashes', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);

      const mockGit = createMockGit({
        clone: vi.fn().mockResolvedValue(undefined),
        revparse: vi.fn().mockResolvedValue('origin/main'),
        branch: vi.fn().mockResolvedValue({
          all: ['main'],
          branches: {},
          current: 'main',
          detached: false,
        }),
        checkoutBranch: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await cloneRepository({
        cloneUrl: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'feature/login',
        rootDir: '/test/root',
      });

      expect(result.success).toBe(true);
      expect(result.targetPath).toBe('/test/root/user/repo/feature-login');
      expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feature/login', 'main');
    });
  });
});
