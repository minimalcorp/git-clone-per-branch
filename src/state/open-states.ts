/**
 * State functions for selecting organization, repository, and branch
 * Used by code and terminal commands
 * Each state is an independent function with explicit parameters
 */

import { selectWithEsc } from '../utils/inquirer-helpers.js';
import type {
  OpenSelectBranchInput,
  OpenSelectBranchOutput,
  OpenSelectOrgInput,
  OpenSelectOrgOutput,
  OpenSelectRepoInput,
  OpenSelectRepoOutput,
  StateResult,
} from './types.js';

/**
 * State 1: Select organization
 */
export async function openSelectOrg(
  input: OpenSelectOrgInput
): Promise<StateResult<OpenSelectOrgOutput>> {
  const { repositories, preselectedOrg } = input;

  // If preselected org is provided and valid, skip prompt
  const orgs = [...new Set(repositories.map((r) => r.owner))];
  if (preselectedOrg && orgs.includes(preselectedOrg)) {
    return {
      value: { org: preselectedOrg },
    };
  }

  if (orgs.length === 0) {
    throw new Error('No organizations found');
  }

  // Pre-calculate repository counts for each organization
  const orgCounts = new Map<string, number>();
  repositories.forEach((r) => {
    orgCounts.set(r.owner, (orgCounts.get(r.owner) || 0) + 1);
  });

  const org = await selectWithEsc<string>({
    message: 'Select organization:',
    choices: orgs.map((o) => ({
      name: `${o} (${orgCounts.get(o)} repos)`,
      value: o,
    })),
  });

  return {
    value: { org },
  };
}

/**
 * State 2: Select repository
 */
export async function openSelectRepo(
  input: OpenSelectRepoInput
): Promise<StateResult<OpenSelectRepoOutput>> {
  const { repositories, org, preselectedRepo } = input;

  // Filter repositories by selected org
  const orgRepos = repositories.filter((r) => r.owner === org);

  // If preselected repo is provided and valid, skip prompt
  if (preselectedRepo && orgRepos.some((r) => r.repo === preselectedRepo)) {
    return {
      value: { repo: preselectedRepo },
    };
  }

  if (orgRepos.length === 0) {
    throw new Error('No repositories found');
  }

  const repo = await selectWithEsc<string>({
    message: 'Select repository:',
    choices: orgRepos.map((r) => ({
      name: `${r.repo} (${r.branches.length} branches)`,
      value: r.repo,
    })),
  });

  return {
    value: { repo },
  };
}

/**
 * State 3: Select branch to open (single-select)
 */
export async function openSelectBranch(
  input: OpenSelectBranchInput
): Promise<StateResult<OpenSelectBranchOutput>> {
  const { branches, preselectedBranch } = input;

  // If preselected branch is provided and valid, skip prompt
  if (preselectedBranch && branches.includes(preselectedBranch)) {
    return {
      value: { branch: preselectedBranch },
    };
  }

  if (branches.length === 0) {
    throw new Error('No branches found');
  }

  const selectedBranch = await selectWithEsc<string>({
    message: 'Select branch to open:',
    choices: branches.map((b) => ({ name: b, value: b })),
  });

  return {
    value: { branch: selectedBranch },
  };
}
