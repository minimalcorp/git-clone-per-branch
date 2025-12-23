import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  rmSelectOrg,
  rmSelectRepo,
  rmSelectBranches,
  rmConfirmRemoval,
} from '../../../src/state/rm-states.js';
import type {
  RmSelectOrgInput,
  RmSelectRepoInput,
  RmSelectBranchesInput,
  RmConfirmRemovalInput,
} from '../../../src/state/types.js';

// Mock the inquirer-helpers module
vi.mock('../../../src/utils/inquirer-helpers.js', () => ({
  selectWithEsc: vi.fn(),
  checkboxWithEsc: vi.fn(),
  confirmWithEsc: vi.fn(),
}));

import {
  selectWithEsc,
  checkboxWithEsc,
  confirmWithEsc,
} from '../../../src/utils/inquirer-helpers.js';

describe('rm-states', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('rmSelectOrg', () => {
    test('should prompt for org selection', async () => {
      const input: RmSelectOrgInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org1', repo: 'repo2', branches: ['main'] },
          { owner: 'org2', repo: 'repo3', branches: ['main'] },
        ],
      };

      vi.mocked(selectWithEsc).mockResolvedValue('org1');

      const result = await rmSelectOrg(input);

      expect(result.value.org).toBe('org1');
      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select organization:',
          choices: expect.any(Array),
        })
      );
    });

    test('should skip prompt when preselected org is valid', async () => {
      const input: RmSelectOrgInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org2', repo: 'repo2', branches: ['main'] },
        ],
        preselectedOrg: 'org1',
      };

      const result = await rmSelectOrg(input);

      expect(result.value.org).toBe('org1');
      expect(selectWithEsc).not.toHaveBeenCalled();
    });

    test('should prompt when preselected org is not valid', async () => {
      const input: RmSelectOrgInput = {
        repositories: [{ owner: 'org1', repo: 'repo1', branches: ['main'] }],
        preselectedOrg: 'invalid-org',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('org1');

      const result = await rmSelectOrg(input);

      expect(result.value.org).toBe('org1');
      expect(selectWithEsc).toHaveBeenCalled();
    });

    test('should throw error when no organizations found', async () => {
      const input: RmSelectOrgInput = {
        repositories: [],
      };

      await expect(rmSelectOrg(input)).rejects.toThrow('No organizations found');
    });
  });

  describe('rmSelectRepo', () => {
    test('should prompt for repo selection', async () => {
      const input: RmSelectRepoInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org1', repo: 'repo2', branches: ['main', 'dev'] },
        ],
        org: 'org1',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('repo1');

      const result = await rmSelectRepo(input);

      expect(result.value.repo).toBe('repo1');
      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select repository:',
          choices: expect.any(Array),
        })
      );
    });

    test('should skip prompt when preselected repo is valid', async () => {
      const input: RmSelectRepoInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org1', repo: 'repo2', branches: ['main'] },
        ],
        org: 'org1',
        preselectedRepo: 'repo1',
      };

      const result = await rmSelectRepo(input);

      expect(result.value.repo).toBe('repo1');
      expect(selectWithEsc).not.toHaveBeenCalled();
    });

    test('should prompt when preselected repo is not valid', async () => {
      const input: RmSelectRepoInput = {
        repositories: [{ owner: 'org1', repo: 'repo1', branches: ['main'] }],
        org: 'org1',
        preselectedRepo: 'invalid-repo',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('repo1');

      const result = await rmSelectRepo(input);

      expect(result.value.repo).toBe('repo1');
      expect(selectWithEsc).toHaveBeenCalled();
    });

    test('should filter repositories by org', async () => {
      const input: RmSelectRepoInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org2', repo: 'repo2', branches: ['main'] },
        ],
        org: 'org1',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('repo1');

      await rmSelectRepo(input);

      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [{ name: 'repo1 (1 branches)', value: 'repo1' }],
        })
      );
    });

    test('should throw error when no repositories found', async () => {
      const input: RmSelectRepoInput = {
        repositories: [],
        org: 'org1',
      };

      await expect(rmSelectRepo(input)).rejects.toThrow('No repositories found');
    });
  });

  describe('rmSelectBranches', () => {
    test('should prompt for branches selection (multi-select)', async () => {
      const input: RmSelectBranchesInput = {
        branches: ['main', 'dev', 'staging'],
      };

      vi.mocked(checkboxWithEsc).mockResolvedValue(['main', 'dev']);

      const result = await rmSelectBranches(input);

      expect(result.value.selectedBranches).toEqual(['main', 'dev']);
      expect(checkboxWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select branches to remove:',
          choices: expect.any(Array),
        })
      );
    });

    test('should skip prompt when preselected branch is valid', async () => {
      const input: RmSelectBranchesInput = {
        branches: ['main', 'dev', 'staging'],
        preselectedBranch: 'dev',
      };

      const result = await rmSelectBranches(input);

      expect(result.value.selectedBranches).toEqual(['dev']);
      expect(checkboxWithEsc).not.toHaveBeenCalled();
    });

    test('should prompt when preselected branch is not valid', async () => {
      const input: RmSelectBranchesInput = {
        branches: ['main', 'dev'],
        preselectedBranch: 'invalid-branch',
      };

      vi.mocked(checkboxWithEsc).mockResolvedValue(['main']);

      const result = await rmSelectBranches(input);

      expect(result.value.selectedBranches).toEqual(['main']);
      expect(checkboxWithEsc).toHaveBeenCalled();
    });

    test('should throw error when no branches found', async () => {
      const input: RmSelectBranchesInput = {
        branches: [],
      };

      await expect(rmSelectBranches(input)).rejects.toThrow('No branches found');
    });

    test('should include validation for selecting at least one branch', async () => {
      const input: RmSelectBranchesInput = {
        branches: ['main', 'dev'],
      };

      vi.mocked(checkboxWithEsc).mockResolvedValue(['main']);

      await rmSelectBranches(input);

      expect(checkboxWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          validate: expect.any(Function),
        })
      );

      // Test the validation function
      const config = vi.mocked(checkboxWithEsc).mock.calls[0][0];
      const validateFn = config.validate;
      if (typeof validateFn === 'function') {
        expect(validateFn([])).toBe('Please select at least one branch');
        expect(validateFn(['main'])).toBe(true);
      }
    });
  });

  describe('rmConfirmRemoval', () => {
    // Mock console.log to prevent output during tests
    const originalConsoleLog = console.log;
    beforeEach(() => {
      console.log = vi.fn();
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    test('should prompt for confirmation', async () => {
      const input: RmConfirmRemovalInput = {
        rootDir: '/root',
        org: 'org1',
        repo: 'repo1',
        branches: ['main', 'dev'],
      };

      vi.mocked(confirmWithEsc).mockResolvedValue(true);

      const result = await rmConfirmRemoval(input);

      expect(result.value.confirmed).toBe(true);
      expect(confirmWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Are you sure you want to remove these branches?',
          default: false,
        })
      );
    });

    test('should skip confirmation when force flag is true', async () => {
      const input: RmConfirmRemovalInput = {
        rootDir: '/root',
        org: 'org1',
        repo: 'repo1',
        branches: ['main'],
        force: true,
      };

      const result = await rmConfirmRemoval(input);

      expect(result.value.confirmed).toBe(true);
      expect(confirmWithEsc).not.toHaveBeenCalled();
    });

    test('should return false when user declines confirmation', async () => {
      const input: RmConfirmRemovalInput = {
        rootDir: '/root',
        org: 'org1',
        repo: 'repo1',
        branches: ['main'],
      };

      vi.mocked(confirmWithEsc).mockResolvedValue(false);

      const result = await rmConfirmRemoval(input);

      expect(result.value.confirmed).toBe(false);
    });

    test('should display branch paths for confirmation', async () => {
      const input: RmConfirmRemovalInput = {
        rootDir: '/root',
        org: 'org1',
        repo: 'repo1',
        branches: ['main', 'dev'],
      };

      vi.mocked(confirmWithEsc).mockResolvedValue({ confirm: true });

      await rmConfirmRemoval(input);

      expect(console.log).toHaveBeenCalled();
      // Verify that paths are being logged (implementation detail)
    });
  });
});
