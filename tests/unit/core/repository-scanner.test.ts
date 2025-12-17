import { describe, test, expect, vi, beforeEach } from 'vitest';
import { isGitRepository, scanRepositories } from '../../../src/core/repository-scanner.js';
import { GCPBError } from '../../../src/types/index.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('repository-scanner', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('isGitRepository', () => {
    test('should return true when .git directory exists', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true, isFile: () => false } as any);

      const result = await isGitRepository('/path/to/repo');

      expect(result).toBe(true);
      expect(fs.stat).toHaveBeenCalledWith('/path/to/repo/.git');
    });

    test('should return true when .git file exists (worktree)', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false, isFile: () => true } as any);

      const result = await isGitRepository('/path/to/worktree');

      expect(result).toBe(true);
      expect(fs.stat).toHaveBeenCalledWith('/path/to/worktree/.git');
    });

    test('should return false when .git does not exist', async () => {
      const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      vi.mocked(fs.stat).mockRejectedValue(error);

      const result = await isGitRepository('/path/without/git');

      expect(result).toBe(false);
    });

    test('should return false on permission denied (EACCES)', async () => {
      const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      vi.mocked(fs.stat).mockRejectedValue(error);

      const result = await isGitRepository('/path/denied');

      expect(result).toBe(false);
    });

    test('should return false on permission denied (EPERM)', async () => {
      const error = Object.assign(new Error('EPERM'), { code: 'EPERM' });
      vi.mocked(fs.stat).mockRejectedValue(error);

      const result = await isGitRepository('/path/denied');

      expect(result).toBe(false);
    });

    test('should throw error for unexpected errors', async () => {
      const error = new Error('Unexpected error');
      vi.mocked(fs.stat).mockRejectedValue(error);

      await expect(isGitRepository('/path/error')).rejects.toThrow('Unexpected error');
    });
  });

  describe('scanRepositories', () => {
    test('should scan owner/repo/branch structure', async () => {
      // Mock root directory listing
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1', 'owner2'] as any)
        // Mock owner1 repos
        .mockResolvedValueOnce(['repo1'] as any)
        // Mock owner1/repo1 branches
        .mockResolvedValueOnce(['main', 'develop'] as any)
        // Mock owner2 repos
        .mockResolvedValueOnce(['repo2'] as any)
        // Mock owner2/repo2 branches
        .mockResolvedValueOnce(['feature'] as any);

      // Mock stat calls for directories
      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        const pathStr = path.toString();
        if (pathStr.includes('.git')) {
          return { isDirectory: () => true, isFile: () => false } as any;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toEqual([
        {
          owner: 'owner1',
          repo: 'repo1',
          branches: ['main', 'develop'],
          fullPath: '/test/root/owner1/repo1',
        },
        {
          owner: 'owner2',
          repo: 'repo2',
          branches: ['feature'],
          fullPath: '/test/root/owner2/repo2',
        },
      ]);
    });

    test('should skip .gcpb directory', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['.gcpb', 'owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any)
        .mockResolvedValueOnce(['main'] as any);

      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true, isFile: () => false } as any);

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe('owner1');
    });

    test('should skip non-directory entries at owner level', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['file.txt', 'owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any)
        .mockResolvedValueOnce(['main'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        if (path.toString().includes('file.txt')) {
          return { isDirectory: () => false, isFile: () => true } as any;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe('owner1');
    });

    test('should skip non-directory entries at repo level', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['file.txt', 'repo1'] as any)
        .mockResolvedValueOnce(['main'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        if (path.toString().includes('file.txt')) {
          return { isDirectory: () => false, isFile: () => true } as any;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(1);
      expect(result[0].repo).toBe('repo1');
    });

    test('should skip non-git directories at branch level', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any)
        .mockResolvedValueOnce(['main', 'not-git'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        const pathStr = path.toString();
        if (pathStr.endsWith('main/.git')) {
          return { isDirectory: () => true, isFile: () => false } as any;
        }
        if (pathStr.endsWith('not-git/.git')) {
          const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
          throw error;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(1);
      expect(result[0].branches).toEqual(['main']);
    });

    test('should handle permission denied at owner level', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['denied', 'owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any)
        .mockResolvedValueOnce(['main'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        if (path.toString().includes('denied')) {
          const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
          throw error;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe('owner1');
    });

    test('should handle permission denied at repo level', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['denied', 'repo1'] as any)
        .mockResolvedValueOnce(['main'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        if (path.toString().includes('denied')) {
          const error = Object.assign(new Error('EPERM'), { code: 'EPERM' });
          throw error;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(1);
      expect(result[0].repo).toBe('repo1');
    });

    test('should handle permission denied at branch level', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any)
        .mockResolvedValueOnce(['denied', 'main'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        if (path.toString().includes('denied')) {
          const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
          throw error;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(1);
      expect(result[0].branches).toEqual(['main']);
    });

    test('should skip repos with no valid git branches', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['repo1', 'repo2'] as any)
        .mockResolvedValueOnce(['not-git'] as any)
        .mockResolvedValueOnce(['main'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        const pathStr = path.toString();
        if (pathStr.endsWith('not-git/.git')) {
          const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
          throw error;
        }
        if (pathStr.endsWith('main/.git')) {
          return { isDirectory: () => true, isFile: () => false } as any;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(1);
      expect(result[0].repo).toBe('repo2');
    });

    test('should return empty array when root directory is empty', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await scanRepositories('/test/empty');

      expect(result).toEqual([]);
    });

    test('should throw GCPBError on unexpected errors', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Unexpected error'));

      await expect(scanRepositories('/test/error')).rejects.toThrow(GCPBError);
      await expect(scanRepositories('/test/error')).rejects.toThrow('Failed to scan repositories');
    });

    test('should handle complex nested structure', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['org1', 'org2', 'file.txt'] as any)
        // org1 repos
        .mockResolvedValueOnce(['project-a', 'project-b'] as any)
        // org1/project-a branches
        .mockResolvedValueOnce(['main', 'develop', 'feature'] as any)
        // org1/project-b branches
        .mockResolvedValueOnce(['main'] as any)
        // org2 repos
        .mockResolvedValueOnce(['app'] as any)
        // org2/app branches
        .mockResolvedValueOnce(['production', 'staging'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        const pathStr = path.toString();
        if (pathStr.includes('file.txt')) {
          return { isDirectory: () => false, isFile: () => true } as any;
        }
        return { isDirectory: () => true, isFile: () => false } as any;
      });

      const result = await scanRepositories('/test/root');

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        {
          owner: 'org1',
          repo: 'project-a',
          branches: ['main', 'develop', 'feature'],
          fullPath: '/test/root/org1/project-a',
        },
        {
          owner: 'org1',
          repo: 'project-b',
          branches: ['main'],
          fullPath: '/test/root/org1/project-b',
        },
        {
          owner: 'org2',
          repo: 'app',
          branches: ['production', 'staging'],
          fullPath: '/test/root/org2/app',
        },
      ]);
    });
  });
});
