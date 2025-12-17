import { describe, test } from 'node:test';
import assert from 'node:assert';
import { sanitizeBranchName, validateBranchName, validateGitUrl } from './validators.js';

describe('validators', () => {
  describe('sanitizeBranchName', () => {
    test('should replace forward slashes with hyphens', () => {
      assert.strictEqual(sanitizeBranchName('feat/xxx'), 'feat-xxx');
      assert.strictEqual(sanitizeBranchName('feature/login/auth'), 'feature-login-auth');
      assert.strictEqual(sanitizeBranchName('main'), 'main');
    });
  });

  describe('validateBranchName', () => {
    test('should accept valid branch names', () => {
      assert.strictEqual(validateBranchName('main').valid, true);
      assert.strictEqual(validateBranchName('feature-branch').valid, true);
      assert.strictEqual(validateBranchName('feat/xxx').valid, true);
    });

    test('should reject empty branch names', () => {
      const result = validateBranchName('');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('cannot be empty'));
    });

    test('should reject branch names with invalid patterns', () => {
      assert.strictEqual(validateBranchName('..').valid, false);
      assert.strictEqual(validateBranchName('.branch').valid, false);
      assert.strictEqual(validateBranchName('branch/').valid, false);
    });
  });

  describe('validateGitUrl', () => {
    test('should accept valid HTTPS URLs', () => {
      assert.strictEqual(validateGitUrl('https://github.com/user/repo.git').valid, true);
      assert.strictEqual(validateGitUrl('https://github.com/user/repo').valid, true);
    });

    test('should accept valid SSH URLs', () => {
      assert.strictEqual(validateGitUrl('git@github.com:user/repo.git').valid, true);
    });

    test('should reject invalid URLs', () => {
      const result = validateGitUrl('not-a-url');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('Invalid Git URL'));
    });
  });
});
