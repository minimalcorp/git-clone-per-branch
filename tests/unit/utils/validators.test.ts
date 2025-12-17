import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeBranchName,
  validateBranchName,
  validateGitUrl,
  validateTargetPath,
  checkGitInstalled,
  validateRemoteBranchNotExists,
} from '../../../src/utils/validators.js';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import simpleGit from 'simple-git';
import { createMockGit, createBranchSummary } from '../../helpers/mock-git.js';
import { mockExecSync, mockExecSyncThrow } from '../../helpers/mock-process.js';

vi.mock('fs-extra');
vi.mock('child_process');
vi.mock('simple-git');

describe('validators', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('sanitizeBranchName', () => {
    test('should replace forward slashes with hyphens', () => {
      expect(sanitizeBranchName('feat/xxx')).toBe('feat-xxx');
      expect(sanitizeBranchName('feature/login/auth')).toBe('feature-login-auth');
      expect(sanitizeBranchName('main')).toBe('main');
    });
  });

  describe('validateBranchName', () => {
    test('should accept valid branch names', () => {
      expect(validateBranchName('main').valid).toBe(true);
      expect(validateBranchName('feature-branch').valid).toBe(true);
      expect(validateBranchName('feat/xxx').valid).toBe(true);
    });

    test('should reject empty branch names', () => {
      const result = validateBranchName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    test('should reject branch names with invalid patterns', () => {
      expect(validateBranchName('..').valid).toBe(false);
      expect(validateBranchName('.branch').valid).toBe(false);
      expect(validateBranchName('branch/').valid).toBe(false);
    });
  });

  describe('validateGitUrl', () => {
    test('should accept valid HTTPS URLs', () => {
      expect(validateGitUrl('https://github.com/user/repo.git').valid).toBe(true);
      expect(validateGitUrl('https://github.com/user/repo').valid).toBe(true);
    });

    test('should accept valid SSH URLs', () => {
      expect(validateGitUrl('git@github.com:user/repo.git').valid).toBe(true);
    });

    test('should reject invalid URLs', () => {
      const result = validateGitUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Git URL');
    });
  });

  describe('validateTargetPath', () => {
    test('should return valid when path does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await validateTargetPath('/path/to/new/directory');

      expect(result.valid).toBe(true);
      expect(fs.pathExists).toHaveBeenCalledWith('/path/to/new/directory');
    });

    test('should return invalid when path already exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);

      const result = await validateTargetPath('/path/to/existing/directory');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists');
    });

    test('should return invalid when pathExists throws error', async () => {
      vi.mocked(fs.pathExists).mockRejectedValue(new Error('Permission denied'));

      const result = await validateTargetPath('/path/to/directory');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Failed to check target path');
    });
  });

  describe('checkGitInstalled', () => {
    test('should return valid when git is installed', () => {
      vi.mocked(execSync).mockImplementation(mockExecSync());

      const result = checkGitInstalled();

      expect(result.valid).toBe(true);
      expect(execSync).toHaveBeenCalledWith('git --version', { stdio: 'ignore' });
    });

    test('should return invalid when git is not installed', () => {
      vi.mocked(execSync).mockImplementation(mockExecSyncThrow(new Error('Command not found')));

      const result = checkGitInstalled();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Git is not installed');
    });
  });

  describe('validateRemoteBranchNotExists', () => {
    test('should return valid when remote branch does not exist', async () => {
      const mockGit = createMockGit({
        branch: vi
          .fn()
          .mockResolvedValue(createBranchSummary(['main', 'remotes/origin/main'], 'main')),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await validateRemoteBranchNotExists(mockGit as any, 'new-branch');

      expect(result.valid).toBe(true);
    });

    test('should return invalid when remote branch already exists', async () => {
      const mockGit = createMockGit({
        branch: vi
          .fn()
          .mockResolvedValue(
            createBranchSummary(
              ['main', 'remotes/origin/main', 'remotes/origin/existing-branch'],
              'main'
            )
          ),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await validateRemoteBranchNotExists(mockGit as any, 'existing-branch');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists');
    });

    test('should return invalid when git.branch throws error', async () => {
      const mockGit = createMockGit({
        branch: vi.fn().mockRejectedValue(new Error('Git error')),
      });
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await validateRemoteBranchNotExists(mockGit as any, 'test-branch');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Failed to check remote branches');
    });
  });
});
