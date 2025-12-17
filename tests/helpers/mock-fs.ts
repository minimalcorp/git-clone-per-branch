import { vi } from 'vitest';

/**
 * Create mock functions for fs-extra module
 */
export function createMockFs() {
  return {
    pathExists: vi.fn(),
    readJson: vi.fn(),
    writeJson: vi.fn(),
    ensureDir: vi.fn(),
    remove: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    realpath: vi.fn(),
  };
}

/**
 * Create a mock file system structure
 * @param structure - Object representing directory structure
 * @example
 * mockFsWithStructure({
 *   '.gcpb': { 'settings.json': { repositories: [] } },
 *   'owner1': { 'repo1': { 'main': { '.git': {} } } }
 * })
 */
export function mockFsWithStructure(structure: Record<string, any>) {
  const mockFs = createMockFs();

  // Helper to check if path exists in structure
  mockFs.pathExists.mockImplementation(async (path: string) => {
    const parts = path.split('/').filter(Boolean);
    let current = structure;

    for (const part of parts) {
      if (current[part] === undefined) {
        return false;
      }
      current = current[part];
    }
    return true;
  });

  return mockFs;
}
