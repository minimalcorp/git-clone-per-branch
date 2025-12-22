import { describe, test, expect } from 'vitest';
import { parsePathArg, type ParsedPathArgs } from '../../../src/utils/arg-parser.js';

describe('arg-parser', () => {
  describe('parsePathArg', () => {
    test('should parse complete path (org/repo/branch)', () => {
      const result = parsePathArg('myorg/myrepo/feature-branch');

      expect(result.org).toBe('myorg');
      expect(result.repo).toBe('myrepo');
      expect(result.branch).toBe('feature-branch');
      expect(result.isComplete).toBe(true);
    });

    test('should parse partial path (org/repo)', () => {
      const result = parsePathArg('myorg/myrepo');

      expect(result.org).toBe('myorg');
      expect(result.repo).toBe('myrepo');
      expect(result.branch).toBeUndefined();
      expect(result.isComplete).toBe(false);
    });

    test('should parse partial path (org only)', () => {
      const result = parsePathArg('myorg');

      expect(result.org).toBe('myorg');
      expect(result.repo).toBeUndefined();
      expect(result.branch).toBeUndefined();
      expect(result.isComplete).toBe(false);
    });

    test('should handle empty path', () => {
      const result = parsePathArg('');

      expect(result.org).toBeUndefined();
      expect(result.repo).toBeUndefined();
      expect(result.branch).toBeUndefined();
      expect(result.isComplete).toBe(false);
    });

    test('should handle undefined path', () => {
      const result = parsePathArg(undefined);

      expect(result.org).toBeUndefined();
      expect(result.repo).toBeUndefined();
      expect(result.branch).toBeUndefined();
      expect(result.isComplete).toBe(false);
    });

    test('should handle path with trailing slash', () => {
      const result = parsePathArg('myorg/myrepo/');

      expect(result.org).toBe('myorg');
      expect(result.repo).toBe('myrepo');
      expect(result.branch).toBeUndefined();
      expect(result.isComplete).toBe(false);
    });

    test('should handle path with leading slash', () => {
      const result = parsePathArg('/myorg/myrepo/branch');

      expect(result.org).toBe('myorg');
      expect(result.repo).toBe('myrepo');
      expect(result.branch).toBe('branch');
      expect(result.isComplete).toBe(true);
    });

    test('should handle branch names with slashes', () => {
      const result = parsePathArg('myorg/myrepo/feature/new-login');

      // Note: This only captures first 3 components
      // Branch names with slashes need special handling in orchestrator
      expect(result.org).toBe('myorg');
      expect(result.repo).toBe('myrepo');
      expect(result.branch).toBe('feature');
      expect(result.isComplete).toBe(true);
    });
  });
});
