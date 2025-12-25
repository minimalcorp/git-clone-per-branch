import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  executeCodeCommand,
  executeCodeCommandInteractive,
} from '../../src/orchestrators/code-orchestrator.js';
import type { Logger } from '../../src/utils/logger.js';

// Mock all dependencies
vi.mock('../../src/core/repository-scanner.js');
vi.mock('../../src/state/open-states.js');
vi.mock('../../src/core/editor.js');

import { scanRepositories } from '../../src/core/repository-scanner.js';
import { openSelectOrg, openSelectRepo, openSelectBranch } from '../../src/state/open-states.js';
import { openInVSCode } from '../../src/core/editor.js';

describe('code-orchestrator', () => {
  const mockLogger: Logger = {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('executeCodeCommand (direct mode)', () => {
    test('should open repository when complete path provided', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main', 'dev'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(openInVSCode).mockResolvedValue(true);

      const result = await executeCodeCommand('/root', 'org1/repo1/main', mockLogger);

      expect(result.success).toBe(true);
      expect(result.targetPath).toBe('/root/org1/repo1/main');
      expect(scanRepositories).toHaveBeenCalledWith('/root');
      expect(openInVSCode).toHaveBeenCalledWith({ targetPath: '/root/org1/repo1/main' });
    });

    test('should return error when path is incomplete', async () => {
      const result = await executeCodeCommand('/root', 'org1/repo1', mockLogger);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Incomplete path');
      expect(scanRepositories).not.toHaveBeenCalled();
    });

    test('should return error when repository not found', async () => {
      vi.mocked(scanRepositories).mockResolvedValue([]);

      const result = await executeCodeCommand('/root', 'org1/repo1/main', mockLogger);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should return error when branch not found', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main', 'dev'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);

      const result = await executeCodeCommand('/root', 'org1/repo1/nonexistent', mockLogger);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.error).toContain('nonexistent');
    });

    test('should handle VSCode not available', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(openInVSCode).mockResolvedValue(false);

      const result = await executeCodeCommand('/root', 'org1/repo1/main', mockLogger);

      expect(result.success).toBe(true);
      expect(result.vscodeOpened).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.targetPath).toBe('/root/org1/repo1/main');
    });
  });

  describe('executeCodeCommandInteractive (REPL mode)', () => {
    test('should prompt for all selections when no args provided', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main', 'dev'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(openSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(openSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(openSelectBranch).mockResolvedValue({ value: { branch: 'main' } });
      vi.mocked(openInVSCode).mockResolvedValue(true);

      const result = await executeCodeCommandInteractive('/root', undefined, mockLogger);

      expect(result.success).toBe(true);
      expect(openSelectOrg).toHaveBeenCalledWith({
        repositories,
        preselectedOrg: undefined,
      });
      expect(openSelectRepo).toHaveBeenCalledWith({
        repositories,
        org: 'org1',
        preselectedRepo: undefined,
      });
      expect(openSelectBranch).toHaveBeenCalledWith({
        branches: ['main', 'dev'],
        preselectedBranch: undefined,
      });
    });

    test('should skip org prompt when org provided in path', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(openSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(openSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(openSelectBranch).mockResolvedValue({ value: { branch: 'main' } });
      vi.mocked(openInVSCode).mockResolvedValue(true);

      const result = await executeCodeCommandInteractive('/root', 'org1', mockLogger);

      expect(result.success).toBe(true);
      expect(openSelectOrg).toHaveBeenCalledWith({
        repositories,
        preselectedOrg: 'org1',
      });
    });

    test('should skip org and repo prompts when both provided', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main', 'dev'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(openSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(openSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(openSelectBranch).mockResolvedValue({ value: { branch: 'main' } });
      vi.mocked(openInVSCode).mockResolvedValue(true);

      const result = await executeCodeCommandInteractive('/root', 'org1/repo1', mockLogger);

      expect(result.success).toBe(true);
      expect(openSelectOrg).toHaveBeenCalledWith({
        repositories,
        preselectedOrg: 'org1',
      });
      expect(openSelectRepo).toHaveBeenCalledWith({
        repositories,
        org: 'org1',
        preselectedRepo: 'repo1',
      });
    });

    test('should return error when no repositories found', async () => {
      vi.mocked(scanRepositories).mockResolvedValue([]);

      const result = await executeCodeCommandInteractive('/root', undefined, mockLogger);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No repositories found');
      expect(openSelectOrg).not.toHaveBeenCalled();
    });

    test('should work without logger', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(openSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(openSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(openSelectBranch).mockResolvedValue({ value: { branch: 'main' } });
      vi.mocked(openInVSCode).mockResolvedValue(true);

      const result = await executeCodeCommandInteractive('/root');

      expect(result.success).toBe(true);
      // Should not throw error when logger is undefined
    });

    test('should handle VSCode not available in interactive mode', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(openSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(openSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(openSelectBranch).mockResolvedValue({ value: { branch: 'main' } });
      vi.mocked(openInVSCode).mockResolvedValue(false);

      const result = await executeCodeCommandInteractive('/root', undefined, mockLogger);

      expect(result.success).toBe(true);
      expect(result.vscodeOpened).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.targetPath).toBe('/root/org1/repo1/main');
    });
  });
});
