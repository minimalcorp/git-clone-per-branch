/**
 * State machine types for GCPB CLI
 * Each state function returns a StateResult containing the output value
 * and an optional cancellation flag for future ESC key support
 */

/**
 * Generic result type for all state functions
 */
export interface StateResult<T> {
  value: T;
  cancelled?: boolean;
}

// ============================================================================
// Add Command State Types (8 states)
// ============================================================================

/**
 * addSelectMode: Choose between manual URL entry or select from existing owners/cache
 */
export interface AddSelectModeInput {
  hasExistingOwners: boolean;
  hasCachedOwners: boolean;
}

export interface AddSelectModeOutput {
  mode: 'manual' | 'select' | 'cache';
}

/**
 * addSelectOwner: Select organization from available owners
 */
export interface AddSelectOwnerInput {
  rootDir: string;
  availableOwners: string[];
}

export interface AddSelectOwnerOutput {
  owner: string;
}

/**
 * addSelectRepo: Select repository under chosen owner
 */
export interface AddSelectRepoInput {
  availableRepos: string[];
}

export interface AddSelectRepoOutput {
  repo: string;
}

/**
 * addResolveUrl: Attempt to detect repository URL from existing branches
 */
export interface AddResolveUrlInput {
  rootDir: string;
  owner: string;
  repo: string;
}

export interface AddResolveUrlOutput {
  url: string | null;
  detectedFrom?: string;
}

/**
 * addConfirmUrl: Ask if user wants to use detected URL
 */
export interface AddConfirmUrlInput {
  url: string;
  detectedFrom: string;
}

export interface AddConfirmUrlOutput {
  useDetected: boolean;
}

/**
 * addSelectCacheOwner: Select organization from cache
 */
export interface AddSelectCacheOwnerInput {
  rootDir: string;
  availableCacheOwners: string[];
}

export interface AddSelectCacheOwnerOutput {
  owner: string;
}

/**
 * addSelectCacheRepo: Select repository from cache
 */
export interface AddSelectCacheRepoInput {
  rootDir: string;
  owner: string;
  availableCacheRepos: string[];
}

export interface AddSelectCacheRepoOutput {
  repo: string;
}

/**
 * addResolveCacheUrl: Get repository URL from cache
 */
export interface AddResolveCacheUrlInput {
  rootDir: string;
  owner: string;
  repo: string;
}

export interface AddResolveCacheUrlOutput {
  url: string | null;
}

/**
 * addEnterUrl: Manually enter repository URL
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AddEnterUrlInput {
  // Empty - no input parameters needed
}

export interface AddEnterUrlOutput {
  url: string;
}

/**
 * addConfigureBranches: Configure base and target branch names
 */
export interface AddConfigureBranchesInput {
  url: string;
  rootDir: string;
  owner: string;
  repo: string;
}

export interface AddConfigureBranchesOutput {
  baseBranch: string;
  targetBranch: string;
  defaultBranch: string;
}

/**
 * addConfirmClone: Final confirmation before cloning
 */
export interface AddConfirmCloneInput {
  url: string;
  baseBranch: string;
  targetBranch: string;
  targetPath: string;
  skipConfirmation?: boolean;
}

export interface AddConfirmCloneOutput {
  confirmed: boolean;
}

// ============================================================================
// Remove Command State Types (4 states)
// ============================================================================

/**
 * rmSelectOrg: Select organization
 */
export interface RmSelectOrgInput {
  repositories: Array<{ owner: string; repo: string; branches: string[] }>;
  preselectedOrg?: string;
}

export interface RmSelectOrgOutput {
  org: string;
}

/**
 * rmSelectRepo: Select repository
 */
export interface RmSelectRepoInput {
  repositories: Array<{ owner: string; repo: string; branches: string[] }>;
  org: string;
  preselectedRepo?: string;
}

export interface RmSelectRepoOutput {
  repo: string;
}

/**
 * rmSelectBranches: Select branches to remove (multi-select)
 */
export interface RmSelectBranchesInput {
  branches: string[];
  preselectedBranch?: string;
}

export interface RmSelectBranchesOutput {
  selectedBranches: string[];
}

/**
 * rmConfirmRemoval: Confirm removal
 */
export interface RmConfirmRemovalInput {
  rootDir: string;
  org: string;
  repo: string;
  branches: string[];
  force?: boolean;
}

export interface RmConfirmRemovalOutput {
  confirmed: boolean;
}

// ============================================================================
// Open Command State Types (3 states)
// ============================================================================

/**
 * openSelectOrg: Select organization
 */
export interface OpenSelectOrgInput {
  repositories: Array<{ owner: string; repo: string; branches: string[] }>;
  preselectedOrg?: string;
}

export interface OpenSelectOrgOutput {
  org: string;
}

/**
 * openSelectRepo: Select repository
 */
export interface OpenSelectRepoInput {
  repositories: Array<{ owner: string; repo: string; branches: string[] }>;
  org: string;
  preselectedRepo?: string;
}

export interface OpenSelectRepoOutput {
  repo: string;
}

/**
 * openSelectBranch: Select branch to open (single-select)
 */
export interface OpenSelectBranchInput {
  branches: string[];
  preselectedBranch?: string;
}

export interface OpenSelectBranchOutput {
  branch: string;
}
