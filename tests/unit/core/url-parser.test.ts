import { describe, test, expect } from 'vitest';
import { parseGitUrl } from '../../../src/core/url-parser.js';
import { GCPBError } from '../../../src/types/index.js';
import { TEST_URLS } from '../../helpers/fixtures.js';

describe('url-parser', () => {
  describe('parseGitUrl', () => {
    describe('HTTPS URLs', () => {
      test('should parse valid HTTPS URL with .git extension', () => {
        const result = parseGitUrl(TEST_URLS.https);

        expect(result).toEqual({
          owner: 'user',
          repo: 'repo',
          protocol: 'https',
          fullUrl: TEST_URLS.https,
        });
      });

      test('should parse valid HTTPS URL without .git extension', () => {
        const result = parseGitUrl(TEST_URLS.httpsWithoutGit);

        expect(result).toEqual({
          owner: 'user',
          repo: 'repo',
          protocol: 'https',
          fullUrl: TEST_URLS.httpsWithoutGit,
        });
      });

      test('should remove .git suffix from repo name', () => {
        const result = parseGitUrl('https://github.com/owner/repository.git');

        expect(result.repo).toBe('repository');
        expect(result.repo).not.toContain('.git');
      });
    });

    describe('SSH URLs', () => {
      test('should parse valid SSH URL with .git extension', () => {
        const result = parseGitUrl(TEST_URLS.ssh);

        expect(result).toEqual({
          owner: 'user',
          repo: 'repo',
          protocol: 'ssh',
          fullUrl: TEST_URLS.ssh,
        });
      });

      test('should parse valid SSH URL without .git extension', () => {
        const result = parseGitUrl(TEST_URLS.sshWithoutGit);

        expect(result).toEqual({
          owner: 'user',
          repo: 'repo',
          protocol: 'ssh',
          fullUrl: TEST_URLS.sshWithoutGit,
        });
      });
    });

    describe('Error cases', () => {
      test('should throw GCPBError for invalid URL', () => {
        expect(() => parseGitUrl(TEST_URLS.invalid)).toThrow(GCPBError);
        expect(() => parseGitUrl(TEST_URLS.invalid)).toThrow('Failed to parse Git URL');
      });

      test('should throw GCPBError for URL without owner', () => {
        expect(() => parseGitUrl('https://github.com/repo')).toThrow(GCPBError);
        expect(() => parseGitUrl('https://github.com/repo')).toThrow('Invalid Git URL format');
      });

      test('should throw GCPBError for URL without repo', () => {
        expect(() => parseGitUrl('https://github.com/owner/')).toThrow(GCPBError);
      });

      test('should throw GCPBError for empty string', () => {
        expect(() => parseGitUrl('')).toThrow(GCPBError);
      });
    });

    describe('Protocol detection', () => {
      test('should detect HTTPS protocol', () => {
        const result = parseGitUrl('https://github.com/user/repo.git');
        expect(result.protocol).toBe('https');
      });

      test('should detect SSH protocol', () => {
        const result = parseGitUrl('git@github.com:user/repo.git');
        expect(result.protocol).toBe('ssh');
      });

      test('should handle HTTP as HTTPS', () => {
        const result = parseGitUrl('http://github.com/user/repo.git');
        expect(result.protocol).toBe('https');
      });
    });

    describe('Real-world URLs', () => {
      test('should parse GitHub HTTPS URL', () => {
        const result = parseGitUrl('https://github.com/facebook/react.git');

        expect(result.owner).toBe('facebook');
        expect(result.repo).toBe('react');
        expect(result.protocol).toBe('https');
      });

      test('should parse GitHub SSH URL', () => {
        const result = parseGitUrl('git@github.com:microsoft/typescript.git');

        expect(result.owner).toBe('microsoft');
        expect(result.repo).toBe('typescript');
        expect(result.protocol).toBe('ssh');
      });

      test('should parse GitLab HTTPS URL', () => {
        const result = parseGitUrl('https://gitlab.com/gitlab-org/gitlab.git');

        expect(result.owner).toBe('gitlab-org');
        expect(result.repo).toBe('gitlab');
      });

      test('should parse Bitbucket SSH URL', () => {
        const result = parseGitUrl('git@bitbucket.org:atlassian/jira.git');

        expect(result.owner).toBe('atlassian');
        expect(result.repo).toBe('jira');
      });
    });

    describe('Edge cases', () => {
      test('should handle repo names with dots', () => {
        const result = parseGitUrl('https://github.com/user/repo.name.git');

        expect(result.repo).toBe('repo.name');
      });

      test('should handle repo names with hyphens', () => {
        const result = parseGitUrl('https://github.com/user/repo-name.git');

        expect(result.repo).toBe('repo-name');
      });

      test('should handle repo names with underscores', () => {
        const result = parseGitUrl('https://github.com/user/repo_name.git');

        expect(result.repo).toBe('repo_name');
      });
    });
  });
});
