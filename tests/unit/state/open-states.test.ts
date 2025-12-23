import { describe, test, expect, vi, beforeEach } from 'vitest';
import { openSelectOrg, openSelectRepo, openSelectBranch } from '../../../src/state/open-states.js';
import type {
  OpenSelectOrgInput,
  OpenSelectRepoInput,
  OpenSelectBranchInput,
} from '../../../src/state/types.js';

// Mock the inquirer-helpers module
vi.mock('../../../src/utils/inquirer-helpers.js', () => ({
  selectWithEsc: vi.fn(),
}));

import { selectWithEsc } from '../../../src/utils/inquirer-helpers.js';

describe('open-states', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('openSelectOrg', () => {
    test('should prompt for org selection', async () => {
      const input: OpenSelectOrgInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org1', repo: 'repo2', branches: ['main'] },
          { owner: 'org2', repo: 'repo3', branches: ['main'] },
        ],
      };

      vi.mocked(selectWithEsc).mockResolvedValue('org1');

      const result = await openSelectOrg(input);

      expect(result.value.org).toBe('org1');
      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'list',
          name: 'org',
          message: 'Select organization:',
        })
      );
    });

    test('should skip prompt when preselected org is valid', async () => {
      const input: OpenSelectOrgInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org2', repo: 'repo2', branches: ['main'] },
        ],
        preselectedOrg: 'org1',
      };

      const result = await openSelectOrg(input);

      expect(result.value.org).toBe('org1');
      expect(selectWithEsc).not.toHaveBeenCalled();
    });

    test('should prompt when preselected org is not valid', async () => {
      const input: OpenSelectOrgInput = {
        repositories: [{ owner: 'org1', repo: 'repo1', branches: ['main'] }],
        preselectedOrg: 'invalid-org',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('org1');

      const result = await openSelectOrg(input);

      expect(result.value.org).toBe('org1');
      expect(selectWithEsc).toHaveBeenCalled();
    });

    test('should throw error when no organizations found', async () => {
      const input: OpenSelectOrgInput = {
        repositories: [],
      };

      await expect(openSelectOrg(input)).rejects.toThrow('No organizations found');
    });

    test('should show repo count for each org', async () => {
      const input: OpenSelectOrgInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org1', repo: 'repo2', branches: ['main'] },
          { owner: 'org2', repo: 'repo3', branches: ['main'] },
        ],
      };

      vi.mocked(selectWithEsc).mockResolvedValue('org1');

      await openSelectOrg(input);

      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            { name: 'org1 (2 repos)', value: 'org1' },
            { name: 'org2 (1 repos)', value: 'org2' },
          ],
        })
      );
    });
  });

  describe('openSelectRepo', () => {
    test('should prompt for repo selection', async () => {
      const input: OpenSelectRepoInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org1', repo: 'repo2', branches: ['main', 'dev'] },
        ],
        org: 'org1',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('repo1');

      const result = await openSelectRepo(input);

      expect(result.value.repo).toBe('repo1');
      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'list',
          name: 'repo',
          message: 'Select repository:',
        })
      );
    });

    test('should skip prompt when preselected repo is valid', async () => {
      const input: OpenSelectRepoInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org1', repo: 'repo2', branches: ['main'] },
        ],
        org: 'org1',
        preselectedRepo: 'repo1',
      };

      const result = await openSelectRepo(input);

      expect(result.value.repo).toBe('repo1');
      expect(selectWithEsc).not.toHaveBeenCalled();
    });

    test('should prompt when preselected repo is not valid', async () => {
      const input: OpenSelectRepoInput = {
        repositories: [{ owner: 'org1', repo: 'repo1', branches: ['main'] }],
        org: 'org1',
        preselectedRepo: 'invalid-repo',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('repo1');

      const result = await openSelectRepo(input);

      expect(result.value.repo).toBe('repo1');
      expect(selectWithEsc).toHaveBeenCalled();
    });

    test('should filter repositories by org', async () => {
      const input: OpenSelectRepoInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main'] },
          { owner: 'org2', repo: 'repo2', branches: ['main'] },
        ],
        org: 'org1',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('repo1');

      await openSelectRepo(input);

      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [{ name: 'repo1 (1 branches)', value: 'repo1' }],
        })
      );
    });

    test('should throw error when no repositories found', async () => {
      const input: OpenSelectRepoInput = {
        repositories: [],
        org: 'org1',
      };

      await expect(openSelectRepo(input)).rejects.toThrow('No repositories found');
    });

    test('should show branch count for each repo', async () => {
      const input: OpenSelectRepoInput = {
        repositories: [
          { owner: 'org1', repo: 'repo1', branches: ['main', 'dev', 'staging'] },
          { owner: 'org1', repo: 'repo2', branches: ['main'] },
        ],
        org: 'org1',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('repo1');

      await openSelectRepo(input);

      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            { name: 'repo1 (3 branches)', value: 'repo1' },
            { name: 'repo2 (1 branches)', value: 'repo2' },
          ],
        })
      );
    });
  });

  describe('openSelectBranch', () => {
    test('should prompt for branch selection', async () => {
      const input: OpenSelectBranchInput = {
        branches: ['main', 'dev', 'staging'],
      };

      vi.mocked(selectWithEsc).mockResolvedValue('main');

      const result = await openSelectBranch(input);

      expect(result.value.branch).toBe('main');
      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'list',
          name: 'selectedBranch',
          message: 'Select branch to open:',
        })
      );
    });

    test('should skip prompt when preselected branch is valid', async () => {
      const input: OpenSelectBranchInput = {
        branches: ['main', 'dev', 'staging'],
        preselectedBranch: 'dev',
      };

      const result = await openSelectBranch(input);

      expect(result.value.branch).toBe('dev');
      expect(selectWithEsc).not.toHaveBeenCalled();
    });

    test('should prompt when preselected branch is not valid', async () => {
      const input: OpenSelectBranchInput = {
        branches: ['main', 'dev'],
        preselectedBranch: 'invalid-branch',
      };

      vi.mocked(selectWithEsc).mockResolvedValue('main');

      const result = await openSelectBranch(input);

      expect(result.value.branch).toBe('main');
      expect(selectWithEsc).toHaveBeenCalled();
    });

    test('should throw error when no branches found', async () => {
      const input: OpenSelectBranchInput = {
        branches: [],
      };

      await expect(openSelectBranch(input)).rejects.toThrow('No branches found');
    });

    test('should list all branches as choices', async () => {
      const input: OpenSelectBranchInput = {
        branches: ['main', 'dev', 'staging', 'feature/new'],
      };

      vi.mocked(selectWithEsc).mockResolvedValue('main');

      await openSelectBranch(input);

      expect(selectWithEsc).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: [
            { name: 'main', value: 'main' },
            { name: 'dev', value: 'dev' },
            { name: 'staging', value: 'staging' },
            { name: 'feature/new', value: 'feature/new' },
          ],
        })
      );
    });
  });
});
