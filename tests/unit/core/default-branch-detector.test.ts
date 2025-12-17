import { describe, test, expect, vi, beforeEach } from 'vitest';
import { detectDefaultBranch } from '../../../src/core/default-branch-detector.js';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import * as repositoryScanner from '../../../src/core/repository-scanner.js';
import { createMockGit } from '../../helpers/mock-git.js';

vi.mock('fs-extra');
vi.mock('simple-git');
vi.mock('../../../src/core/repository-scanner.js');

describe('default-branch-detector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('detectDefaultBranch', () => {
    describe('from existing clone', () => {
      test('should detect default branch from existing clone', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(true);
        vi.mocked(fs.readdir).mockResolvedValue(['main', 'develop'] as any);
        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

        const mockGit = createMockGit({
          revparse: vi.fn().mockResolvedValue('origin/main'),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
        expect(mockGit.revparse).toHaveBeenCalledWith(['--abbrev-ref', 'origin/HEAD']);
      });

      test('should trim whitespace from branch name', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(true);
        vi.mocked(fs.readdir).mockResolvedValue(['main'] as any);
        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

        const mockGit = createMockGit({
          revparse: vi.fn().mockResolvedValue('origin/develop  \n'),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('develop');
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
          revparse: vi.fn().mockResolvedValue('origin/main'),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
      });

      test('should skip non-git directories', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(true);
        vi.mocked(fs.readdir).mockResolvedValue(['not-git', 'main'] as any);
        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

        vi.mocked(repositoryScanner.isGitRepository)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true);

        const mockGit = createMockGit({
          revparse: vi.fn().mockResolvedValue('origin/main'),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
      });

      test('should skip branch when revparse fails', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(true);
        vi.mocked(fs.readdir).mockResolvedValue(['error-branch', 'main'] as any);
        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

        const mockGit1 = createMockGit({
          revparse: vi.fn().mockRejectedValue(new Error('No origin/HEAD')),
        });

        const mockGit2 = createMockGit({
          revparse: vi.fn().mockResolvedValue('origin/develop'),
        });

        vi.mocked(simpleGit)
          .mockReturnValueOnce(mockGit1 as any)
          .mockReturnValueOnce(mockGit2 as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('develop');
      });
    });

    describe('from remote ls-remote', () => {
      test('should detect default branch from git ls-remote', async () => {
        // No existing clone
        vi.mocked(fs.pathExists).mockResolvedValue(false);

        // Mock git ls-remote
        const mockGit = createMockGit({
          listRemote: vi.fn().mockResolvedValue('ref: refs/heads/main\tHEAD\n'),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
        expect(mockGit.listRemote).toHaveBeenCalledWith([
          '--symref',
          'https://github.com/user/repo.git',
          'HEAD',
        ]);
      });

      test('should detect develop as default branch', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(false);

        const mockGit = createMockGit({
          listRemote: vi.fn().mockResolvedValue('ref: refs/heads/develop\tHEAD\n'),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('develop');
      });

      test('should fall back when listRemote fails', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(false);

        const mockGit = createMockGit({
          listRemote: vi.fn().mockRejectedValue(new Error('Network error')),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
      });

      test('should fall back when listRemote returns unexpected format', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(false);

        const mockGit = createMockGit({
          listRemote: vi.fn().mockResolvedValue('unexpected output'),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
      });

      test('should work without owner and repo', async () => {
        const mockGit = createMockGit({
          listRemote: vi.fn().mockResolvedValue('ref: refs/heads/main\tHEAD\n'),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch('https://github.com/user/repo.git', '/test/root');

        expect(result).toBe('main');
        // Should skip existing clone check
        expect(fs.pathExists).not.toHaveBeenCalled();
      });
    });

    describe('fallback to main', () => {
      test('should return main when all detection methods fail', async () => {
        // No existing clone
        vi.mocked(fs.pathExists).mockResolvedValue(false);

        // ls-remote fails
        const mockGit = createMockGit({
          listRemote: vi.fn().mockRejectedValue(new Error('Network error')),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
      });

      test('should return main when repo directory does not exist', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(false);

        const mockGit = createMockGit({
          listRemote: vi.fn().mockRejectedValue(new Error('Failed')),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
      });

      test('should return main when readdir fails', async () => {
        vi.mocked(fs.pathExists).mockResolvedValue(true);
        vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

        const mockGit = createMockGit({
          listRemote: vi.fn().mockRejectedValue(new Error('Failed')),
        });
        vi.mocked(simpleGit).mockReturnValue(mockGit as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        expect(result).toBe('main');
      });
    });

    describe('priority order', () => {
      test('should prefer existing clone over ls-remote', async () => {
        // Setup existing clone
        vi.mocked(fs.pathExists).mockResolvedValue(true);
        vi.mocked(fs.readdir).mockResolvedValue(['main'] as any);
        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(repositoryScanner.isGitRepository).mockResolvedValue(true);

        const mockGitLocal = createMockGit({
          revparse: vi.fn().mockResolvedValue('origin/develop'),
        });

        const mockGitRemote = createMockGit({
          listRemote: vi.fn().mockResolvedValue('ref: refs/heads/main\tHEAD\n'),
        });

        vi.mocked(simpleGit)
          .mockReturnValueOnce(mockGitLocal as any)
          .mockReturnValueOnce(mockGitRemote as any);

        const result = await detectDefaultBranch(
          'https://github.com/user/repo.git',
          '/test/root',
          'user',
          'repo'
        );

        // Should use existing clone result (develop), not ls-remote (main)
        expect(result).toBe('develop');
        expect(mockGitLocal.revparse).toHaveBeenCalled();
        expect(mockGitRemote.listRemote).not.toHaveBeenCalled();
      });
    });
  });
});
