import inquirer from 'inquirer';
import { search } from '@inquirer/prompts';
import type { CloneConfig } from '../types/index.js';
import { validateGitUrl, validateBranchName, sanitizeBranchName } from '../utils/validators.js';
import { parseGitUrl } from '../core/url-parser.js';
import { detectContext } from '../core/context-detector.js';
import { resolveRemoteUrl } from '../core/remote-resolver.js';
import { detectDefaultBranch } from '../core/default-branch-detector.js';
import path from 'path';

interface ConfirmAnswers {
  confirm: boolean;
}

export async function promptForCloneConfig(rootDir: string): Promise<CloneConfig> {
  // Step 1: Get the clone URL
  const { cloneUrl } = await inquirer.prompt<{ cloneUrl: string }>([
    {
      type: 'input',
      name: 'cloneUrl',
      message: 'Enter the Git repository URL:',
      validate: (input: string) => {
        const validation = validateGitUrl(input);
        if (!validation.valid) {
          return validation.error || 'Invalid URL';
        }
        // Additional validation by trying to parse
        try {
          parseGitUrl(input);
          return true;
        } catch (error) {
          return error instanceof Error ? error.message : 'Failed to parse URL';
        }
      },
    },
  ]);

  // Step 2: Detect default branch
  const parsed = parseGitUrl(cloneUrl);
  const defaultBranch = await detectDefaultBranch(cloneUrl, rootDir, parsed.owner, parsed.repo);

  // Step 3: Get branch names
  const answers = await inquirer.prompt<{
    baseBranch: string;
    targetBranch: string;
  }>([
    {
      type: 'input',
      name: 'baseBranch',
      message: 'Enter the remote branch name:',
      default: defaultBranch,
      validate: (input: string) => {
        // Allow origin/ prefix for remote branches
        const branchName = input.replace(/^origin\//, '');
        const validation = validateBranchName(branchName);
        return validation.valid || validation.error || 'Invalid branch name';
      },
    },
    {
      type: 'input',
      name: 'targetBranch',
      message: 'Enter the local branch name:',
      validate: (input: string) => {
        const validation = validateBranchName(input);
        return validation.valid || validation.error || 'Invalid branch name';
      },
    },
  ]);

  // Show confirmation of directory structure
  const targetPath = path.join(
    rootDir,
    parsed.owner,
    parsed.repo,
    sanitizeBranchName(answers.targetBranch)
  );

  console.log('');
  console.log(`Repository will be cloned to:`);
  console.log(`  ${targetPath}`);
  console.log('');

  const { confirm } = await inquirer.prompt<ConfirmAnswers>([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      default: true,
    },
  ]);

  if (!confirm) {
    throw new Error('Operation cancelled by user');
  }

  return {
    cloneUrl,
    baseBranch: answers.baseBranch,
    targetBranch: answers.targetBranch,
  };
}

/**
 * Helper function to prompt for URL input
 */
async function promptForUrl(): Promise<string> {
  const { cloneUrl } = await inquirer.prompt<{ cloneUrl: string }>([
    {
      type: 'input',
      name: 'cloneUrl',
      message: 'Enter the Git repository URL:',
      validate: (input: string) => {
        const validation = validateGitUrl(input);
        if (!validation.valid) {
          return validation.error || 'Invalid URL';
        }
        try {
          parseGitUrl(input);
          return true;
        } catch (error) {
          return error instanceof Error ? error.message : 'Failed to parse URL';
        }
      },
    },
  ]);
  return cloneUrl;
}

/**
 * Prompts for clone configuration with context awareness
 * Automatically detects owner/repo from current directory and attempts to resolve URL
 */
export async function promptForCloneConfigWithContext(rootDir: string): Promise<CloneConfig> {
  const currentDir = process.cwd();
  const context = await detectContext(rootDir, currentDir);

  let cloneUrl: string | undefined;
  let owner: string | undefined = context.owner;
  let repo: string | undefined = context.repo;

  // Step 1: Handle root directory case
  if (
    context.location === 'root' &&
    context.availableOwners &&
    context.availableOwners.length > 0
  ) {
    const { mode } = await inquirer.prompt<{ mode: string }>([
      {
        type: 'list',
        name: 'mode',
        message: 'How do you want to add a repository?',
        choices: [
          { name: 'Select from existing owners', value: 'select' },
          { name: 'Enter repository URL manually', value: 'manual' },
        ],
      },
    ]);

    if (mode === 'manual') {
      // User chose manual entry, proceed to URL input
      cloneUrl = await promptForUrl();
    }
    // If mode === 'select', we'll select owner below
  }

  // Step 2: Select owner if needed
  if (!cloneUrl && context.location === 'root' && context.availableOwners) {
    owner = await search({
      message: 'Select owner:',
      source: async (term) => {
        const searchTerm = term || '';
        return Promise.resolve(
          context
            .availableOwners!.filter((o: string) =>
              o.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((o: string) => ({ name: o, value: o }))
        );
      },
    });

    // After selecting owner, we need to get repos for this owner
    const ownerContext = await detectContext(rootDir, path.join(rootDir, owner));
    if (ownerContext.availableRepos && ownerContext.availableRepos.length > 0) {
      repo = await search({
        message: 'Select repository:',
        source: async (term) => {
          const searchTerm = term || '';
          return Promise.resolve(
            ownerContext
              .availableRepos!.filter((r: string) =>
                r.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((r: string) => ({ name: r, value: r }))
          );
        },
      });
    } else {
      // No repos found, fall back to manual URL entry
      console.log('No repositories found for this owner.');
      cloneUrl = await promptForUrl();
    }
  }

  // Step 3: Select repo if needed (for owner location)
  if (!cloneUrl && context.location === 'owner' && context.availableRepos) {
    repo = await search({
      message: 'Select repository:',
      source: async (term) => {
        const searchTerm = term || '';
        return Promise.resolve(
          context
            .availableRepos!.filter((r: string) =>
              r.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((r: string) => ({ name: r, value: r }))
        );
      },
    });
  }

  // Step 4: Attempt to resolve URL if owner/repo are determined
  if (!cloneUrl && owner && repo) {
    console.log(`\nDetected context: ${owner}/${repo}`);

    const remoteResult = await resolveRemoteUrl(rootDir, owner, repo);

    if (remoteResult.found) {
      console.log(`Found repository URL from "${remoteResult.source}" branch:`);
      console.log(`  ${remoteResult.url}\n`);

      const { useDetectedUrl } = await inquirer.prompt<{ useDetectedUrl: boolean }>([
        {
          type: 'confirm',
          name: 'useDetectedUrl',
          message: 'Use this repository URL?',
          default: true,
        },
      ]);

      if (useDetectedUrl) {
        cloneUrl = remoteResult.url;
      } else {
        cloneUrl = await promptForUrl();
      }
    } else {
      console.log('Could not detect repository URL from existing branches.\n');
      cloneUrl = await promptForUrl();
    }
  }

  // Step 5: If still no URL, prompt for manual entry
  if (!cloneUrl) {
    cloneUrl = await promptForUrl();
  }

  // Step 5.5: Detect default branch
  const parsed = parseGitUrl(cloneUrl);
  const defaultBranch = await detectDefaultBranch(cloneUrl, rootDir, parsed.owner, parsed.repo);

  // Step 6: Prompt for baseBranch and targetBranch
  const answers = await inquirer.prompt<{
    baseBranch: string;
    targetBranch: string;
  }>([
    {
      type: 'input',
      name: 'baseBranch',
      message: 'Enter the remote branch name:',
      default: defaultBranch,
      validate: (input: string) => {
        const branchName = input.replace(/^origin\//, '');
        const validation = validateBranchName(branchName);
        return validation.valid || validation.error || 'Invalid branch name';
      },
    },
    {
      type: 'input',
      name: 'targetBranch',
      message: 'Enter the local branch name:',
      validate: (input: string) => {
        const validation = validateBranchName(input);
        return validation.valid || validation.error || 'Invalid branch name';
      },
    },
  ]);

  // Step 7: Show confirmation
  const targetPath = path.join(
    rootDir,
    parsed.owner,
    parsed.repo,
    sanitizeBranchName(answers.targetBranch)
  );

  console.log('');
  console.log(`Repository will be cloned to:`);
  console.log(`  ${targetPath}`);
  console.log('');

  const { confirm } = await inquirer.prompt<ConfirmAnswers>([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      default: true,
    },
  ]);

  if (!confirm) {
    throw new Error('Operation cancelled by user');
  }

  return {
    cloneUrl,
    baseBranch: answers.baseBranch,
    targetBranch: answers.targetBranch,
  };
}
