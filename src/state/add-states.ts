/**
 * State functions for the 'add' command
 * Each state is an independent function with explicit parameters
 */

import { getCachePath } from '../core/cache-manager.js';
import { getCacheUrl } from '../core/cache-scanner.js';
import { detectDefaultBranch } from '../core/default-branch-detector.js';
import { resolveRemoteUrl } from '../core/remote-resolver.js';
import { parseGitUrl } from '../core/url-parser.js';
import {
  searchWithEsc,
  inputWithEsc,
  confirmWithEsc,
  selectWithEsc,
} from '../utils/inquirer-helpers.js';
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
  AddResolveCacheUrlInput,
  AddResolveCacheUrlOutput,
  AddResolveUrlInput,
  AddResolveUrlOutput,
  AddSelectCacheOwnerInput,
  AddSelectCacheOwnerOutput,
  AddSelectCacheRepoInput,
  AddSelectCacheRepoOutput,
  AddSelectModeInput,
  AddSelectModeOutput,
  AddSelectOwnerInput,
  AddSelectOwnerOutput,
  AddSelectRepoInput,
  AddSelectRepoOutput,
  StateResult,
} from './types.js';

/**
 * State 1: Choose between manual URL entry, select from cache, or select from existing owners
 */
export async function addSelectMode(
  input: AddSelectModeInput
): Promise<StateResult<AddSelectModeOutput>> {
  const { hasExistingOwners, hasCachedOwners } = input;

  // If no existing owners and no cache, skip to manual mode
  if (!hasExistingOwners && !hasCachedOwners) {
    return {
      value: { mode: 'manual' },
    };
  }

  // Build choices based on what's available
  const choices: Array<{ name: string; value: 'manual' | 'select' | 'cache' }> = [];

  if (hasCachedOwners) {
    choices.push({ name: 'Select from cached repositories', value: 'cache' });
  }

  if (hasExistingOwners) {
    choices.push({ name: 'Select from existing cloned repositories', value: 'select' });
  }

  choices.push({ name: 'Enter repository URL manually', value: 'manual' });

  const mode = await selectWithEsc<'manual' | 'select' | 'cache'>({
    message: 'How do you want to add a repository?',
    choices,
  });

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

  const owner = await searchWithEsc({
    message: 'Select owner:',
    source: async (term: string | undefined) => {
      const searchTerm = term || '';
      return Promise.resolve(
        availableOwners
          .filter((o: string) => o.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((o: string) => ({ name: o, value: o }))
      );
    },
  });

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

  const repo = await searchWithEsc({
    message: 'Select repository:',
    source: async (term: string | undefined) => {
      const searchTerm = term || '';
      return Promise.resolve(
        availableRepos
          .filter((r: string) => r.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((r: string) => ({ name: r, value: r }))
      );
    },
  });

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

  const useDetectedUrl = await confirmWithEsc({
    message: 'Use this repository URL?',
    default: true,
  });

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
  const cloneUrl = await inputWithEsc({
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
  });

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

  const baseBranch = await inputWithEsc({
    message: 'Enter the remote branch name:',
    default: defaultBranch,
    validate: (branchInput: string) => {
      const branchName = branchInput.replace(/^origin\//, '');
      const validation = validateBranchName(branchName);
      return validation.valid || validation.error || 'Invalid branch name';
    },
  });

  const targetBranch = await inputWithEsc({
    message: 'Enter the local branch name:',
    validate: (branchInput: string) => {
      const validation = validateBranchName(branchInput);
      return validation.valid || validation.error || 'Invalid branch name';
    },
  });

  return {
    value: {
      baseBranch,
      targetBranch,
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

  const confirm = await confirmWithEsc({
    message: 'Continue?',
    default: true,
  });

  return {
    value: { confirmed: confirm },
  };
}

/**
 * State: Select organization from cache
 */
export async function addSelectCacheOwner(
  input: AddSelectCacheOwnerInput
): Promise<StateResult<AddSelectCacheOwnerOutput>> {
  const { availableCacheOwners } = input;

  if (availableCacheOwners.length === 0) {
    throw new Error('No cached owners found');
  }

  const owner = await searchWithEsc<string>({
    message: 'Select cached owner:',
    source: async (term: string | undefined) => {
      const searchTerm = term || '';
      return Promise.resolve(
        availableCacheOwners
          .filter((o: string) => o.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((o: string) => ({ name: o, value: o }))
      );
    },
  });

  return {
    value: { owner },
  };
}

/**
 * State: Select repository from cache under chosen owner
 */
export async function addSelectCacheRepo(
  input: AddSelectCacheRepoInput
): Promise<StateResult<AddSelectCacheRepoOutput>> {
  const { availableCacheRepos } = input;

  if (availableCacheRepos.length === 0) {
    throw new Error('No cached repositories found for this owner');
  }

  const repo = await searchWithEsc<string>({
    message: 'Select cached repository:',
    source: async (term: string | undefined) => {
      const searchTerm = term || '';
      return Promise.resolve(
        availableCacheRepos
          .filter((r: string) => r.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((r: string) => ({ name: r, value: r }))
      );
    },
  });

  return {
    value: { repo },
  };
}

/**
 * State: Get repository URL from cache
 */
export async function addResolveCacheUrl(
  input: AddResolveCacheUrlInput
): Promise<StateResult<AddResolveCacheUrlOutput>> {
  const { rootDir, owner, repo } = input;

  try {
    const cachePath = getCachePath(rootDir, owner, repo);
    const url = await getCacheUrl(cachePath);

    return {
      value: { url },
    };
  } catch {
    return {
      value: { url: null },
    };
  }
}
