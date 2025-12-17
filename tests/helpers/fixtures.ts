/**
 * Common test fixtures and data
 */

/**
 * Sample Git URLs for testing
 */
export const TEST_URLS = {
  https: 'https://github.com/user/repo.git',
  httpsWithoutGit: 'https://github.com/user/repo',
  ssh: 'git@github.com:user/repo.git',
  sshWithoutGit: 'git@github.com:user/repo',
  invalid: 'not-a-url',
  noOwner: 'https://github.com/repo',
  noRepo: 'https://github.com/user/',
};

/**
 * Sample branch names for testing
 */
export const TEST_BRANCHES = {
  valid: {
    main: 'main',
    develop: 'develop',
    feature: 'feature/new-feature',
    bugfix: 'bugfix/fix-123',
  },
  invalid: {
    empty: '',
    doubleDot: 'feature..test',
    startsWithSlash: '/feature',
    endsWithSlash: 'feature/',
    endsWithLock: 'branch.lock',
    specialChars: 'feature@{test}',
  },
};

/**
 * Sample paths for testing
 */
export const TEST_PATHS = {
  root: '/test/root',
  owner: '/test/root/owner',
  repo: '/test/root/owner/repo',
  branch: '/test/root/owner/repo/main',
  gcpb: '/test/root/.gcpb',
};

/**
 * Sample repository structure
 */
export const TEST_REPO_STRUCTURE = {
  owner: 'testuser',
  repo: 'testrepo',
  defaultBranch: 'main',
  branches: ['main', 'develop', 'feature/test'],
};
