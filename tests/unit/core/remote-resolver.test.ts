import { describe, test, expect, vi, beforeEach } from 'vitest';
import { resolveRemoteUrl } from '../../../src/core/remote-resolver.js';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import * as repositoryScanner from '../../../src/core/repository-scanner.js';
import { createMockGit, mockRemotes } from '../../helpers/mock-git.js';

vi.mock('fs-extra');
vi.mock('simple-git');
vi.mock('../../../src/core/repository-scanner.js');

describe('remote-resolver', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('resolveRemoteUrl', () => {
    test('should resolve remote URL from first valid branch', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['main', 'develop'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

      const mockGit = createMockGit({
        getRemotes: vi.fn().mockResolvedValue(mockRemotes),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result).toEqual({
        found: true,
        url: 'git@github.com:user/repo.git',
        source: 'main',
      });
    });

    test('should skip non-directory entries', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['file.txt', 'main'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        if (path.toString().includes('file.txt')) {
          return { isDirectory: () => false } as any;
        }
        return { isDirectory: () => true } as any;
      });

      vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

      const mockGit = createMockGit({
        getRemotes: vi.fn().mockResolvedValue(mockRemotes),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result.found).toBe(true);
      expect(result.source).toBe('main');
    });

    test('should skip non-git directories', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['not-git', 'main'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      vi.mocked(repositoryScanner.isGitRepository)
        .mockResolvedValueOnce(false) // not-git
        .mockResolvedValueOnce(true); // main

      const mockGit = createMockGit({
        getRemotes: vi.fn().mockResolvedValue(mockRemotes),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result.found).toBe(true);
      expect(result.source).toBe('main');
    });

    test('should skip branches without origin remote', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['branch1', 'branch2'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

      const mockGit1 = createMockGit({
        getRemotes: vi
          .fn()
          .mockResolvedValue([{ name: 'upstream', refs: { fetch: 'upstream-url' } }]),
      });

      const mockGit2 = createMockGit({
        getRemotes: vi.fn().mockResolvedValue(mockRemotes),
      });

      vi.mocked(simpleGit)
        .mockReturnValueOnce(mockGit1 as any)
        .mockReturnValueOnce(mockGit2 as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result).toEqual({
        found: true,
        url: 'git@github.com:user/repo.git',
        source: 'branch2',
      });
    });

    test('should skip branches with origin but no fetch URL', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['branch1', 'branch2'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

      const mockGit1 = createMockGit({
        getRemotes: vi.fn().mockResolvedValue([
          { name: 'origin', refs: {} }, // no fetch URL
        ]),
      });

      const mockGit2 = createMockGit({
        getRemotes: vi.fn().mockResolvedValue(mockRemotes),
      });

      vi.mocked(simpleGit)
        .mockReturnValueOnce(mockGit1 as any)
        .mockReturnValueOnce(mockGit2 as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result).toEqual({
        found: true,
        url: 'git@github.com:user/repo.git',
        source: 'branch2',
      });
    });

    test('should return not found when repo directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result).toEqual({ found: false });
    });

    test('should return not found when readdir fails', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result).toEqual({ found: false });
    });

    test('should skip branch when stat fails', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['error-branch', 'main'] as any);

      vi.mocked(fs.stat)
        .mockRejectedValueOnce(new Error('Stat failed'))
        .mockResolvedValueOnce({ isDirectory: () => true } as any);

      vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

      const mockGit = createMockGit({
        getRemotes: vi.fn().mockResolvedValue(mockRemotes),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result.found).toBe(true);
      expect(result.source).toBe('main');
    });

    test('should skip branch when getRemotes fails', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['error-branch', 'main'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

      const mockGit1 = createMockGit({
        getRemotes: vi.fn().mockRejectedValue(new Error('Git error')),
      });

      const mockGit2 = createMockGit({
        getRemotes: vi.fn().mockResolvedValue(mockRemotes),
      });

      vi.mocked(simpleGit)
        .mockReturnValueOnce(mockGit1 as any)
        .mockReturnValueOnce(mockGit2 as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result.found).toBe(true);
      expect(result.source).toBe('main');
    });

    test('should return not found when no branches have valid remote URL', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['branch1', 'branch2'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

      const mockGit = createMockGit({
        getRemotes: vi.fn().mockResolvedValue([]),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result).toEqual({ found: false });
    });

    test('should return not found when all branches are empty', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result).toEqual({ found: false });
    });

    test('should handle multiple branches and use the first valid one', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['feature', 'develop', 'main'] as any);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

      const mockGit = createMockGit({
        getRemotes: vi.fn().mockResolvedValue(mockRemotes),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await resolveRemoteUrl('/test/root', 'owner1', 'repo1');

      expect(result).toEqual({
        found: true,
        url: 'git@github.com:user/repo.git',
        source: 'feature',
      });
    });
  });
});
