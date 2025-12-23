import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  executeRemoveCommand,
  executeRemoveCommandInteractive,
} from '../../src/orchestrators/rm-orchestrator.js';
import type { Logger } from '../../src/utils/logger.js';

// Mock all dependencies
vi.mock('fs-extra');
vi.mock('../../src/core/repository-scanner.js');
vi.mock('../../src/core/config.js');
vi.mock('../../src/state/rm-states.js');

import fs from 'fs-extra';
import { scanRepositories } from '../../src/core/repository-scanner.js';
import { cleanupEmptyDirectories } from '../../src/core/config.js';
import {
  rmSelectOrg,
  rmSelectRepo,
  rmSelectBranches,
  rmConfirmRemoval,
} from '../../src/state/rm-states.js';

describe('rm-orchestrator', () => {
  const mockLogger: Logger = {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    startSpinner: vi.fn(),
    updateSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    box: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('executeRemoveCommand (direct mode)', () => {
    test('should remove branch when complete path provided with force', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main', 'dev'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: true },
      });
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(cleanupEmptyDirectories).mockResolvedValue(undefined);

      const result = await executeRemoveCommand('/root', 'org1/repo1/main', true, mockLogger);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(1);
      expect(result.org).toBe('org1');
      expect(result.repo).toBe('repo1');
      expect(result.branches).toEqual(['main']);
      expect(scanRepositories).toHaveBeenCalledWith('/root');
      expect(rmConfirmRemoval).toHaveBeenCalledWith({
        rootDir: '/root',
        org: 'org1',
        repo: 'repo1',
        branches: ['main'],
        force: true,
      });
      expect(fs.remove).toHaveBeenCalledWith('/root/org1/repo1/main');
      expect(cleanupEmptyDirectories).toHaveBeenCalledWith('/root');
    });

    test('should prompt for confirmation when force not set', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: true },
      });
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(cleanupEmptyDirectories).mockResolvedValue(undefined);

      await executeRemoveCommand('/root', 'org1/repo1/main', false, mockLogger);

      expect(rmConfirmRemoval).toHaveBeenCalledWith({
        rootDir: '/root',
        org: 'org1',
        repo: 'repo1',
        branches: ['main'],
        force: false,
      });
    });

    test('should cancel when user declines confirmation', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: false },
      });

      const result = await executeRemoveCommand('/root', 'org1/repo1/main', false, mockLogger);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
      expect(fs.remove).not.toHaveBeenCalled();
    });

    test('should return error when path is incomplete', async () => {
      const result = await executeRemoveCommand('/root', 'org1/repo1', false, mockLogger);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Incomplete path');
      expect(scanRepositories).not.toHaveBeenCalled();
    });

    test('should return error when repository not found', async () => {
      vi.mocked(scanRepositories).mockResolvedValue([]);

      const result = await executeRemoveCommand('/root', 'org1/repo1/main', false, mockLogger);

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

      const result = await executeRemoveCommand(
        '/root',
        'org1/repo1/nonexistent',
        false,
        mockLogger
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.error).toContain('nonexistent');
    });
  });

  describe('executeRemoveCommandInteractive (REPL mode)', () => {
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
      vi.mocked(rmSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(rmSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(rmSelectBranches).mockResolvedValue({
        value: { selectedBranches: ['main', 'dev'] },
      });
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: true },
      });
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(cleanupEmptyDirectories).mockResolvedValue(undefined);

      const result = await executeRemoveCommandInteractive('/root', undefined, false, mockLogger);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(2);
      expect(rmSelectOrg).toHaveBeenCalledWith({
        repositories,
        preselectedOrg: undefined,
      });
      expect(rmSelectRepo).toHaveBeenCalledWith({
        repositories,
        org: 'org1',
        preselectedRepo: undefined,
      });
      expect(rmSelectBranches).toHaveBeenCalledWith({
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
      vi.mocked(rmSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(rmSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(rmSelectBranches).mockResolvedValue({
        value: { selectedBranches: ['main'] },
      });
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: true },
      });
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(cleanupEmptyDirectories).mockResolvedValue(undefined);

      const result = await executeRemoveCommandInteractive('/root', 'org1', false, mockLogger);

      expect(result.success).toBe(true);
      expect(rmSelectOrg).toHaveBeenCalledWith({
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
      vi.mocked(rmSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(rmSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(rmSelectBranches).mockResolvedValue({
        value: { selectedBranches: ['main'] },
      });
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: true },
      });
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(cleanupEmptyDirectories).mockResolvedValue(undefined);

      const result = await executeRemoveCommandInteractive(
        '/root',
        'org1/repo1',
        false,
        mockLogger
      );

      expect(result.success).toBe(true);
      expect(rmSelectOrg).toHaveBeenCalledWith({
        repositories,
        preselectedOrg: 'org1',
      });
      expect(rmSelectRepo).toHaveBeenCalledWith({
        repositories,
        org: 'org1',
        preselectedRepo: 'repo1',
      });
    });

    test('should cancel when user declines confirmation', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(rmSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(rmSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(rmSelectBranches).mockResolvedValue({
        value: { selectedBranches: ['main'] },
      });
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: false },
      });

      const result = await executeRemoveCommandInteractive('/root', undefined, false, mockLogger);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
      expect(fs.remove).not.toHaveBeenCalled();
    });

    test('should return error when no repositories found', async () => {
      vi.mocked(scanRepositories).mockResolvedValue([]);

      const result = await executeRemoveCommandInteractive('/root', undefined, false, mockLogger);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No repositories found');
      expect(rmSelectOrg).not.toHaveBeenCalled();
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
      vi.mocked(rmSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(rmSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(rmSelectBranches).mockResolvedValue({
        value: { selectedBranches: ['main'] },
      });
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: true },
      });
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(cleanupEmptyDirectories).mockResolvedValue(undefined);

      const result = await executeRemoveCommandInteractive('/root');

      expect(result.success).toBe(true);
      // Should not throw error when logger is undefined
    });

    test('should skip confirmation when force flag is set', async () => {
      const repositories = [
        {
          owner: 'org1',
          repo: 'repo1',
          branches: ['main'],
          fullPath: '/root/org1/repo1',
        },
      ];

      vi.mocked(scanRepositories).mockResolvedValue(repositories);
      vi.mocked(rmSelectOrg).mockResolvedValue({ value: { org: 'org1' } });
      vi.mocked(rmSelectRepo).mockResolvedValue({ value: { repo: 'repo1' } });
      vi.mocked(rmSelectBranches).mockResolvedValue({
        value: { selectedBranches: ['main'] },
      });
      vi.mocked(rmConfirmRemoval).mockResolvedValue({
        value: { confirmed: true },
      });
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(cleanupEmptyDirectories).mockResolvedValue(undefined);

      await executeRemoveCommandInteractive('/root', undefined, true, mockLogger);

      expect(rmConfirmRemoval).toHaveBeenCalledWith({
        rootDir: '/root',
        org: 'org1',
        repo: 'repo1',
        branches: ['main'],
        force: true,
      });
    });
  });
});
