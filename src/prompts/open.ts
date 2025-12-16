import inquirer from 'inquirer';
import type { RepositoryInfo } from '../types/index.js';

interface OrgAnswer {
  org: string;
}

interface RepoAnswer {
  repo: string;
}

interface BranchAnswer {
  selectedBranch: string;
}

/**
 * Prompts user to select an organization from available repositories
 * Shows the number of repos for each org
 */
export async function promptForOrg(repositories: RepositoryInfo[]): Promise<string> {
  // Get unique organizations
  const orgs = [...new Set(repositories.map((r) => r.owner))];

  if (orgs.length === 0) {
    throw new Error('No organizations found');
  }

  const { org } = await inquirer.prompt<OrgAnswer>([
    {
      type: 'list',
      name: 'org',
      message: 'Select organization:',
      choices: orgs.map((o) => ({
        name: `${o} (${repositories.filter((r) => r.owner === o).length} repos)`,
        value: o,
      })),
    },
  ]);

  return org;
}

/**
 * Prompts user to select a repository from available repositories
 * Shows the number of branches for each repo
 */
export async function promptForRepo(repositories: RepositoryInfo[]): Promise<string> {
  if (repositories.length === 0) {
    throw new Error('No repositories found');
  }

  const { repo } = await inquirer.prompt<RepoAnswer>([
    {
      type: 'list',
      name: 'repo',
      message: 'Select repository:',
      choices: repositories.map((r) => ({
        name: `${r.repo} (${r.branches.length} branches)`,
        value: r.repo,
      })),
    },
  ]);

  return repo;
}

/**
 * Prompts user to select a branch to open (single-select)
 */
export async function promptForBranch(branches: string[]): Promise<string> {
  if (branches.length === 0) {
    throw new Error('No branches found');
  }

  const { selectedBranch } = await inquirer.prompt<BranchAnswer>([
    {
      type: 'list',
      name: 'selectedBranch',
      message: 'Select branch to open:',
      choices: branches.map((b) => ({ name: b, value: b })),
    },
  ]);

  return selectedBranch;
}
