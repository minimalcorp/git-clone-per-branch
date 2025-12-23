import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addSelectMode,
  addSelectOwner,
  addSelectRepo,
  addSelectCacheOwner,
  addSelectCacheRepo,
  addResolveCacheUrl,
  addResolveUrl,
  addConfirmUrl,
  addEnterUrl,
  addConfigureBranches,
  addConfirmClone,
} from '../../../src/state/add-states.js';
import type {
  AddSelectModeInput,
  AddSelectOwnerInput,
  AddSelectRepoInput,
  AddSelectCacheOwnerInput,
  AddSelectCacheRepoInput,
  AddResolveCacheUrlInput,
  AddResolveUrlInput,
  AddConfirmUrlInput,
  AddEnterUrlInput,
  AddConfigureBranchesInput,
  AddConfirmCloneInput,
} from '../../../src/state/types.js';

// Mock dependencies
vi.mock('../../../src/utils/inquirer-helpers.js', () => ({
  searchWithEsc: vi.fn(),
  inputWithEsc: vi.fn(),
  confirmWithEsc: vi.fn(),
  selectWithEsc: vi.fn(),
  checkboxWithEsc: vi.fn(),
}));

vi.mock('../../../src/utils/validators.js', () => ({
  validateGitUrl: vi.fn(),
  validateBranchName: vi.fn(),
  sanitizeBranchName: vi.fn((name) => name.replace(/\//g, '-')),
}));

vi.mock('../../../src/core/url-parser.js', () => ({
  parseGitUrl: vi.fn(),
}));

vi.mock('../../../src/core/remote-resolver.js', () => ({
  resolveRemoteUrl: vi.fn(),
}));

vi.mock('../../../src/core/default-branch-detector.js', () => ({
  detectDefaultBranch: vi.fn(),
}));

vi.mock('../../../src/core/cache-manager.js', () => ({
  getCachePath: vi.fn((rootDir, owner, repo) => `${rootDir}/.gcpb/.cache/${owner}/${repo}`),
}));

vi.mock('../../../src/core/cache-scanner.js', () => ({
  getCacheUrl: vi.fn(),
}));

import {
  searchWithEsc,
  inputWithEsc,
  confirmWithEsc,
  selectWithEsc,
  checkboxWithEsc,
} from '../../../src/utils/inquirer-helpers.js';
import { validateGitUrl, validateBranchName } from '../../../src/utils/validators.js';
import { parseGitUrl } from '../../../src/core/url-parser.js';
import { resolveRemoteUrl } from '../../../src/core/remote-resolver.js';
import { detectDefaultBranch } from '../../../src/core/default-branch-detector.js';
import { getCacheUrl } from '../../../src/core/cache-scanner.js';

describe('add-states', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('addSelectMode', () => {
    test('should return manual mode when no existing owners and no cache', async () => {
      const input: AddSelectModeInput = {
        hasExistingOwners: false,
        hasCachedOwners: false,
      };

      const result = await addSelectMode(input);

      expect(result.value.mode).toBe('manual');
      expect(selectWithEsc).not.toHaveBeenCalled();
    });

    test('should prompt for mode when existing owners available', async () => {
      const input: AddSelectModeInput = {
        hasExistingOwners: true,
        hasCachedOwners: false,
      };

      vi.mocked(selectWithEsc).mockResolvedValue('select');

      const result = await addSelectMode(input);

      expect(result.value.mode).toBe('select');
      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'How do you want to add a repository?',
        })
      );
    });

    test('should prompt for mode when cached owners available', async () => {
      const input: AddSelectModeInput = {
        hasExistingOwners: false,
        hasCachedOwners: true,
      };

      vi.mocked(selectWithEsc).mockResolvedValue('cache');

      const result = await addSelectMode(input);

      expect(result.value.mode).toBe('cache');
      expect(selectWithEsc).toHaveBeenCalled();
    });

    test('should allow selecting manual mode', async () => {
      const input: AddSelectModeInput = {
        hasExistingOwners: true,
        hasCachedOwners: false,
      };

      vi.mocked(selectWithEsc).mockResolvedValue('manual');

      const result = await addSelectMode(input);

      expect(result.value.mode).toBe('manual');
    });
  });

  describe('addSelectOwner', () => {
    test('should prompt for owner selection using searchWithEsc', async () => {
      const input: AddSelectOwnerInput = {
        rootDir: '/root',
        availableOwners: ['org1', 'org2', 'org3'],
      };

      vi.mocked(searchWithEsc).mockResolvedValue('org1');

      const result = await addSelectOwner(input);

      expect(result.value.owner).toBe('org1');
      expect(searchWithEsc).toHaveBeenCalled();
    });

    test('should throw error when no owners available', async () => {
      const input: AddSelectOwnerInput = {
        rootDir: '/root',
        availableOwners: [],
      };

      await expect(addSelectOwner(input)).rejects.toThrow('No owners found');
    });

    test('should filter owners by searchWithEsc term', async () => {
      const input: AddSelectOwnerInput = {
        rootDir: '/root',
        availableOwners: ['github', 'gitlab', 'bitbucket'],
      };

      let sourceFn: any;
      vi.mocked(searchWithEsc).mockImplementation(async (config: any) => {
        sourceFn = config.source;
        return 'github';
      });

      await addSelectOwner(input);

      // Test the source function with a searchWithEsc term
      const filteredResults = await sourceFn('git');
      expect(filteredResults).toEqual([
        { name: 'github', value: 'github' },
        { name: 'gitlab', value: 'gitlab' },
      ]);
    });
  });

  describe('addSelectRepo', () => {
    test('should prompt for repo selection using searchWithEsc', async () => {
      const input: AddSelectRepoInput = {
        rootDir: '/root',
        owner: 'org1',
        availableRepos: ['repo1', 'repo2', 'repo3'],
      };

      vi.mocked(searchWithEsc).mockResolvedValue('repo1');

      const result = await addSelectRepo(input);

      expect(result.value.repo).toBe('repo1');
      expect(searchWithEsc).toHaveBeenCalled();
    });

    test('should throw error when no repos available', async () => {
      const input: AddSelectRepoInput = {
        rootDir: '/root',
        owner: 'org1',
        availableRepos: [],
      };

      await expect(addSelectRepo(input)).rejects.toThrow('No repositories found');
    });

    test('should filter repos by searchWithEsc term', async () => {
      const input: AddSelectRepoInput = {
        rootDir: '/root',
        owner: 'org1',
        availableRepos: ['frontend', 'backend', 'mobile'],
      };

      let sourceFn: any;
      vi.mocked(searchWithEsc).mockImplementation(async (config: any) => {
        sourceFn = config.source;
        return 'frontend';
      });

      await addSelectRepo(input);

      // Test the source function with a searchWithEsc term
      const filteredResults = await sourceFn('end');
      expect(filteredResults).toEqual([
        { name: 'frontend', value: 'frontend' },
        { name: 'backend', value: 'backend' },
      ]);
    });
  });

  describe('addResolveUrl', () => {
    test('should return detected URL when found', async () => {
      const input: AddResolveUrlInput = {
        rootDir: '/root',
        owner: 'org1',
        repo: 'repo1',
      };

      vi.mocked(resolveRemoteUrl).mockResolvedValue({
        found: true,
        url: 'https://github.com/org1/repo1.git',
        source: 'main',
      });

      const result = await addResolveUrl(input);

      expect(result.value.url).toBe('https://github.com/org1/repo1.git');
      expect(result.value.detectedFrom).toBe('main');
    });

    test('should return null when URL not found', async () => {
      const input: AddResolveUrlInput = {
        rootDir: '/root',
        owner: 'org1',
        repo: 'repo1',
      };

      vi.mocked(resolveRemoteUrl).mockResolvedValue({
        found: false,
        url: '',
        source: '',
      });

      const result = await addResolveUrl(input);

      expect(result.value.url).toBeNull();
      expect(result.value.detectedFrom).toBeUndefined();
    });
  });

  describe('addConfirmUrl', () => {
    const originalConsoleLog = console.log;
    beforeEach(() => {
      console.log = vi.fn();
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    test('should prompt for URL confirmation', async () => {
      const input: AddConfirmUrlInput = {
        url: 'https://github.com/org1/repo1.git',
        detectedFrom: 'main',
      };

      vi.mocked(confirmWithEsc).mockResolvedValue(true);

      const result = await addConfirmUrl(input);

      expect(result.value.useDetected).toBe(true);
      expect(console.log).toHaveBeenCalled();
      expect(confirmWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirm',
          name: 'useDetectedUrl',
          message: 'Use this repository URL?',
        })
      );
    });

    test('should allow declining detected URL', async () => {
      const input: AddConfirmUrlInput = {
        url: 'https://github.com/org1/repo1.git',
        detectedFrom: 'main',
      };

      vi.mocked(confirmWithEsc).mockResolvedValue(false);

      const result = await addConfirmUrl(input);

      expect(result.value.useDetected).toBe(false);
    });
  });

  describe('addEnterUrl', () => {
    test('should prompt for manual URL entry', async () => {
      const input: AddEnterUrlInput = {};

      vi.mocked(inputWithEsc).mockResolvedValue({
        cloneUrl: 'https://github.com/user/repo.git',
      });
      vi.mocked(validateGitUrl).mockReturnValue({ valid: true });
      vi.mocked(parseGitUrl).mockReturnValue({
        owner: 'user',
        repo: 'repo',
        protocol: 'https',
      });

      const result = await addEnterUrl(input);

      expect(result.value.url).toBe('https://github.com/user/repo.git');
      expect(inputWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          name: 'cloneUrl',
          message: 'Enter the Git repository URL:',
          validate: expect.any(Function),
        })
      );
    });

    test('should validate URL format', async () => {
      const input: AddEnterUrlInput = {};

      vi.mocked(inputWithEsc).mockResolvedValue({
        cloneUrl: 'https://github.com/user/repo.git',
      });

      await addEnterUrl(input);

      // Get the validate function
      const validateFn = vi.mocked(inputWithEsc).mock.calls[0][0][0].validate;
      if (typeof validateFn === 'function') {
        // Test invalid URL
        vi.mocked(validateGitUrl).mockReturnValue({
          valid: false,
          error: 'Invalid Git URL',
        });
        expect(validateFn('invalid-url')).toBe('Invalid Git URL');

        // Test valid URL
        vi.mocked(validateGitUrl).mockReturnValue({ valid: true });
        vi.mocked(parseGitUrl).mockReturnValue({
          owner: 'user',
          repo: 'repo',
          protocol: 'https',
        });
        expect(validateFn('https://github.com/user/repo.git')).toBe(true);
      }
    });
  });

  describe('addConfigureBranches', () => {
    test('should prompt for branch configuration', async () => {
      const input: AddConfigureBranchesInput = {
        url: 'https://github.com/user/repo.git',
        rootDir: '/root',
        owner: 'user',
        repo: 'repo',
      };

      vi.mocked(detectDefaultBranch).mockResolvedValue('main');
      vi.mocked(inputWithEsc).mockResolvedValue({
        baseBranch: 'main',
        targetBranch: 'feature-branch',
      });
      vi.mocked(validateBranchName).mockReturnValue({ valid: true });

      const result = await addConfigureBranches(input);

      expect(result.value.baseBranch).toBe('main');
      expect(result.value.targetBranch).toBe('feature-branch');
      expect(result.value.defaultBranch).toBe('main');
      expect(detectDefaultBranch).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/root',
        'user',
        'repo'
      );
    });

    test('should use detected default branch as default', async () => {
      const input: AddConfigureBranchesInput = {
        url: 'https://github.com/user/repo.git',
        rootDir: '/root',
        owner: 'user',
        repo: 'repo',
      };

      vi.mocked(detectDefaultBranch).mockResolvedValue('develop');
      vi.mocked(inputWithEsc).mockResolvedValue({
        baseBranch: 'develop',
        targetBranch: 'feature',
      });

      await addConfigureBranches(input);

      expect(inputWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'baseBranch',
          default: 'develop',
        }),
        expect.any(Object)
      );
    });

    test('should validate branch names', async () => {
      const input: AddConfigureBranchesInput = {
        url: 'https://github.com/user/repo.git',
        rootDir: '/root',
        owner: 'user',
        repo: 'repo',
      };

      vi.mocked(detectDefaultBranch).mockResolvedValue('main');
      vi.mocked(inputWithEsc).mockResolvedValue({
        baseBranch: 'main',
        targetBranch: 'feature',
      });

      await addConfigureBranches(input);

      // Get validate functions
      const questions = vi.mocked(inputWithEsc).mock.calls[0][0];
      const baseBranchValidate = questions[0].validate;
      const targetBranchValidate = questions[1].validate;

      if (typeof baseBranchValidate === 'function') {
        vi.mocked(validateBranchName).mockReturnValue({ valid: true });
        expect(baseBranchValidate('main')).toBe(true);

        vi.mocked(validateBranchName).mockReturnValue({
          valid: false,
          error: 'Invalid branch name',
        });
        expect(baseBranchValidate('..invalid')).toBe('Invalid branch name');
      }

      if (typeof targetBranchValidate === 'function') {
        vi.mocked(validateBranchName).mockReturnValue({ valid: true });
        expect(targetBranchValidate('feature')).toBe(true);
      }
    });
  });

  describe('addConfirmClone', () => {
    const originalConsoleLog = console.log;
    beforeEach(() => {
      console.log = vi.fn();
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    test('should skip confirmation when skipConfirmation is true', async () => {
      const input: AddConfirmCloneInput = {
        url: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'feature',
        targetPath: '/root/user/repo/feature',
        skipConfirmation: true,
      };

      const result = await addConfirmClone(input);

      expect(result.value.confirmed).toBe(true);
      expect(confirmWithEsc).not.toHaveBeenCalled();
    });

    test('should prompt for confirmation when skipConfirmation is false', async () => {
      const input: AddConfirmCloneInput = {
        url: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'feature',
        targetPath: '/root/user/repo/feature',
        skipConfirmation: false,
      };

      vi.mocked(confirmWithEsc).mockResolvedValue({ confirm: true });

      const result = await addConfirmClone(input);

      expect(result.value.confirmed).toBe(true);
      expect(console.log).toHaveBeenCalled();
      expect(confirmWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirm',
          name: 'confirm',
          message: 'Continue?',
        })
      );
    });

    test('should allow declining confirmation', async () => {
      const input: AddConfirmCloneInput = {
        url: 'https://github.com/user/repo.git',
        baseBranch: 'main',
        targetBranch: 'feature',
        targetPath: '/root/user/repo/feature',
      };

      vi.mocked(confirmWithEsc).mockResolvedValue({ confirm: false });

      const result = await addConfirmClone(input);

      expect(result.value.confirmed).toBe(false);
    });
  });

  describe('addSelectCacheOwner', () => {
    test('should select owner from cache', async () => {
      const input: AddSelectCacheOwnerInput = {
        rootDir: '/root',
        availableCacheOwners: ['owner1', 'owner2'],
      };

      vi.mocked(search).mockResolvedValue('owner1');

      const result = await addSelectCacheOwner(input);

      expect(result.value.owner).toBe('owner1');
      expect(search).toHaveBeenCalled();
    });

    test('should throw error if no cached owners', async () => {
      const input: AddSelectCacheOwnerInput = {
        rootDir: '/root',
        availableCacheOwners: [],
      };

      await expect(addSelectCacheOwner(input)).rejects.toThrow('No cached owners found');
    });
  });

  describe('addSelectCacheRepo', () => {
    test('should select repo from cache', async () => {
      const input: AddSelectCacheRepoInput = {
        rootDir: '/root',
        owner: 'owner1',
        availableCacheRepos: ['repo1', 'repo2'],
      };

      vi.mocked(search).mockResolvedValue('repo1');

      const result = await addSelectCacheRepo(input);

      expect(result.value.repo).toBe('repo1');
      expect(search).toHaveBeenCalled();
    });

    test('should throw error if no cached repos', async () => {
      const input: AddSelectCacheRepoInput = {
        rootDir: '/root',
        owner: 'owner1',
        availableCacheRepos: [],
      };

      await expect(addSelectCacheRepo(input)).rejects.toThrow(
        'No cached repositories found for this owner'
      );
    });
  });

  describe('addResolveCacheUrl', () => {
    test('should resolve URL from cache', async () => {
      const input: AddResolveCacheUrlInput = {
        rootDir: '/root',
        owner: 'owner1',
        repo: 'repo1',
      };

      vi.mocked(getCacheUrl).mockResolvedValue('https://github.com/owner1/repo1.git');

      const result = await addResolveCacheUrl(input);

      expect(result.value.url).toBe('https://github.com/owner1/repo1.git');
    });

    test('should return null if URL cannot be retrieved', async () => {
      const input: AddResolveCacheUrlInput = {
        rootDir: '/root',
        owner: 'owner1',
        repo: 'repo1',
      };

      vi.mocked(getCacheUrl).mockRejectedValue(new Error('No origin'));

      const result = await addResolveCacheUrl(input);

      expect(result.value.url).toBeNull();
    });
  });
});
