/**
 * State functions for the 'add' command
 * Each state is an independent function with explicit parameters
 */

import { search } from '@inquirer/prompts';
import { detectDefaultBranch } from '../core/default-branch-detector.js';
import { resolveRemoteUrl } from '../core/remote-resolver.js';
import { parseGitUrl } from '../core/url-parser.js';
import { wrappedPrompt, wrapPromptFunction } from '../utils/prompt-wrapper.js';
import { validateBranchName, validateGitUrl } from '../utils/validators.js';
import type {
  AddConfigureBranchesInput,
  AddConfigureBranchesOutput,
  AddConfirmCloneInput,
  AddConfirmCloneOutput,
  AddConfirmUrlInput,
  AddConfirmUrlOutput,
  AddEnterUrlInput,
  AddEnterUrlOutput,
  AddResolveUrlInput,
  AddResolveUrlOutput,
  AddSelectModeInput,
  AddSelectModeOutput,
  AddSelectOwnerInput,
  AddSelectOwnerOutput,
  AddSelectRepoInput,
  AddSelectRepoOutput,
  StateResult,
} from './types.js';

/**
 * State 1: Choose between manual URL entry or select from existing owners
 */
export async function addSelectMode(
  input: AddSelectModeInput
): Promise<StateResult<AddSelectModeOutput>> {
  const { hasExistingOwners } = input;

  // If no existing owners, skip to manual mode
  if (!hasExistingOwners) {
    return {
      value: { mode: 'manual' },
    };
  }

  const { mode } = await wrappedPrompt<{ mode: 'manual' | 'select' }>([
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

  return {
    value: { mode },
  };
}

/**
 * State 2: Select organization from available owners
 */
export async function addSelectOwner(
  input: AddSelectOwnerInput
): Promise<StateResult<AddSelectOwnerOutput>> {
  const { availableOwners } = input;

  if (availableOwners.length === 0) {
    throw new Error('No owners found');
  }

  const owner = await wrapPromptFunction(() =>
    search({
      message: 'Select owner:',
      source: async (term) => {
        const searchTerm = term || '';
        return Promise.resolve(
          availableOwners
            .filter((o: string) => o.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((o: string) => ({ name: o, value: o }))
        );
      },
    })
  );

  return {
    value: { owner },
  };
}

/**
 * State 3: Select repository under chosen owner
 */
export async function addSelectRepo(
  input: AddSelectRepoInput
): Promise<StateResult<AddSelectRepoOutput>> {
  const { availableRepos } = input;

  if (availableRepos.length === 0) {
    throw new Error('No repositories found for this owner');
  }

  const repo = await wrapPromptFunction(() =>
    search({
      message: 'Select repository:',
      source: async (term) => {
        const searchTerm = term || '';
        return Promise.resolve(
          availableRepos
            .filter((r: string) => r.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((r: string) => ({ name: r, value: r }))
        );
      },
    })
  );

  return {
    value: { repo },
  };
}

/**
 * State 4: Attempt to detect repository URL from existing branches
 */
export async function addResolveUrl(
  input: AddResolveUrlInput
): Promise<StateResult<AddResolveUrlOutput>> {
  const { rootDir, owner, repo } = input;

  const remoteResult = await resolveRemoteUrl(rootDir, owner, repo);

  if (remoteResult.found) {
    return {
      value: {
        url: remoteResult.url || null,
        detectedFrom: remoteResult.source,
      },
    };
  }

  return {
    value: {
      url: null,
    },
  };
}

/**
 * State 5: Ask if user wants to use detected URL
 */
export async function addConfirmUrl(
  input: AddConfirmUrlInput
): Promise<StateResult<AddConfirmUrlOutput>> {
  const { url, detectedFrom } = input;

  console.log(`Found repository URL from "${detectedFrom}" branch:`);
  console.log(`  ${url}\n`);

  const { useDetectedUrl } = await wrappedPrompt<{ useDetectedUrl: boolean }>([
    {
      type: 'confirm',
      name: 'useDetectedUrl',
      message: 'Use this repository URL?',
      default: true,
    },
  ]);

  return {
    value: { useDetected: useDetectedUrl },
  };
}

/**
 * State 6: Manually enter repository URL
 */
export async function addEnterUrl(
  _input: AddEnterUrlInput
): Promise<StateResult<AddEnterUrlOutput>> {
  const { cloneUrl } = await wrappedPrompt<{ cloneUrl: string }>([
    {
      type: 'input',
      name: 'cloneUrl',
      message: 'Enter the Git repository URL:',
      validate: (inputUrl: string) => {
        const validation = validateGitUrl(inputUrl);
        if (!validation.valid) {
          return validation.error || 'Invalid URL';
        }
        try {
          parseGitUrl(inputUrl);
          return true;
        } catch (error) {
          return error instanceof Error ? error.message : 'Failed to parse URL';
        }
      },
    },
  ]);

  return {
    value: { url: cloneUrl },
  };
}

/**
 * State 7: Configure base and target branch names
 */
export async function addConfigureBranches(
  input: AddConfigureBranchesInput
): Promise<StateResult<AddConfigureBranchesOutput>> {
  const { url, rootDir, owner, repo } = input;

  // Detect default branch
  const defaultBranch = await detectDefaultBranch(url, rootDir, owner, repo);

  const answers = await wrappedPrompt<{
    baseBranch: string;
    targetBranch: string;
  }>([
    {
      type: 'input',
      name: 'baseBranch',
      message: 'Enter the remote branch name:',
      default: defaultBranch,
      validate: (branchInput: string) => {
        const branchName = branchInput.replace(/^origin\//, '');
        const validation = validateBranchName(branchName);
        return validation.valid || validation.error || 'Invalid branch name';
      },
    },
    {
      type: 'input',
      name: 'targetBranch',
      message: 'Enter the local branch name:',
      validate: (branchInput: string) => {
        const validation = validateBranchName(branchInput);
        return validation.valid || validation.error || 'Invalid branch name';
      },
    },
  ]);

  return {
    value: {
      baseBranch: answers.baseBranch,
      targetBranch: answers.targetBranch,
      defaultBranch,
    },
  };
}

/**
 * State 8: Final confirmation before cloning
 */
export async function addConfirmClone(
  input: AddConfirmCloneInput
): Promise<StateResult<AddConfirmCloneOutput>> {
  const { targetPath, skipConfirmation } = input;

  // Skip confirmation if flag is set
  if (skipConfirmation) {
    return {
      value: { confirmed: true },
    };
  }

  console.log('');
  console.log(`Repository will be cloned to:`);
  console.log(`  ${targetPath}`);
  console.log('');

  const { confirm } = await wrappedPrompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      default: true,
    },
  ]);

  return {
    value: { confirmed: confirm },
  };
}
