import { describe, test, expect } from 'vitest';
import { sanitizeBranchName, validateBranchName, validateGitUrl } from './validators.js';

describe('validators', () => {
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
});
