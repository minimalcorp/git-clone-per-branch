/**
 * State functions for the 'rm' (remove) command
 * Each state is an independent function with explicit parameters
 */

import path from 'path';
import { selectWithEsc, checkboxWithEsc, confirmWithEsc } from '../utils/inquirer-helpers.js';
import type {
  RmConfirmRemovalInput,
  RmConfirmRemovalOutput,
  RmSelectBranchesInput,
  RmSelectBranchesOutput,
  RmSelectOrgInput,
  RmSelectOrgOutput,
  RmSelectRepoInput,
  RmSelectRepoOutput,
  StateResult,
} from './types.js';

/**
 * State 1: Select organization
 */
export async function rmSelectOrg(
  input: RmSelectOrgInput
): Promise<StateResult<RmSelectOrgOutput>> {
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
export async function rmSelectRepo(
  input: RmSelectRepoInput
): Promise<StateResult<RmSelectRepoOutput>> {
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
 * State 3: Select branches to remove (multi-select)
 * Validates that at least one branch is selected
 */
export async function rmSelectBranches(
  input: RmSelectBranchesInput
): Promise<StateResult<RmSelectBranchesOutput>> {
  const { branches, preselectedBranch } = input;

  // If preselected branch is provided and valid, use it (single selection)
  if (preselectedBranch && branches.includes(preselectedBranch)) {
    return {
      value: { selectedBranches: [preselectedBranch] },
    };
  }

  if (branches.length === 0) {
    throw new Error('No branches found');
  }

  const selectedBranches = await checkboxWithEsc<string>({
    message: 'Select branches to remove:',
    choices: branches.map((b) => ({ name: b, value: b })),
    validate: (choices) => {
      if (choices.length === 0) {
        return 'Please select at least one branch';
      }
      return true;
    },
  });

  return {
    value: { selectedBranches },
  };
}

/**
 * State 4: Confirm removal
 * Skip confirmation if force flag is true
 */
export async function rmConfirmRemoval(
  input: RmConfirmRemovalInput
): Promise<StateResult<RmConfirmRemovalOutput>> {
  const { rootDir, org, repo, branches, force } = input;

  // Skip confirmation if force flag is set
  if (force) {
    return {
      value: { confirmed: true },
    };
  }

  // Show what will be deleted
  console.log('');
  console.log('The following branches will be removed:');
  for (const branch of branches) {
    const branchPath = path.join(rootDir, org, repo, branch);
    console.log(`  - ${org}/${repo}/${branch}`);
    console.log(`    (${branchPath})`);
  }
  console.log('');

  const confirm = await confirmWithEsc({
    message: 'Are you sure you want to remove these branches?',
    default: false,
  });

  return {
    value: { confirmed: confirm },
  };
}
