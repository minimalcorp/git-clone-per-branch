import { vi } from 'vitest';
import type { SimpleGit, BranchSummary } from 'simple-git';

/**
 * Create a mock SimpleGit instance
 * @param overrides - Optional overrides for specific git methods
 */
export function createMockGit(overrides?: Partial<SimpleGit>): SimpleGit {
  return {
    clone: vi.fn().mockResolvedValue(undefined),
    fetch: vi.fn().mockResolvedValue(undefined),
    checkout: vi.fn().mockResolvedValue(''),
    checkoutBranch: vi.fn().mockResolvedValue(''),
    checkoutLocalBranch: vi.fn().mockResolvedValue(''),
    branch: vi.fn().mockResolvedValue(mockBranchSummary),
    getRemotes: vi.fn().mockResolvedValue(mockRemotes),
    listRemote: vi.fn().mockResolvedValue(''),
    revparse: vi.fn().mockResolvedValue('main'),
    ...overrides,
  } as unknown as SimpleGit;
}

/**
 * Mock remote configuration
 */
export const mockRemotes = [
  {
    name: 'origin',
    refs: {
      fetch: 'git@github.com:user/repo.git',
      push: 'git@github.com:user/repo.git',
    },
  },
];

/**
 * Mock branch summary
 */
export const mockBranchSummary: BranchSummary = {
  all: ['main', 'remotes/origin/main'],
  branches: {
    main: {
      current: true,
      linkedWorkTree: false,
      name: 'main',
      commit: 'abc123',
      label: 'main',
    },
  },
  current: 'main',
  detached: false,
};

/**
 * Create a custom branch summary with specific branches
 */
export function createBranchSummary(branches: string[], current = 'main'): BranchSummary {
  return {
    all: branches,
    branches: branches.reduce(
      (acc, branch) => {
        acc[branch] = {
          current: branch === current,
          linkedWorkTree: false,
          name: branch,
          commit: 'abc123',
          label: branch,
        };
        return acc;
      },
      {} as BranchSummary['branches']
    ),
    current,
    detached: false,
  };
}
