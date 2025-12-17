import { describe, test, expect, vi, beforeEach } from 'vitest';
import { detectContext } from '../../../src/core/context-detector.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('context-detector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('detectContext', () => {
    describe('outside location', () => {
      test('should return outside when current dir is above root', async () => {
        const result = await detectContext('/home/user/gcpb', '/home/user');

        expect(result).toEqual({ location: 'outside' });
      });

      test('should return outside when current dir is absolute path outside', async () => {
        const result = await detectContext('/home/user/gcpb', '/var/log');

        expect(result).toEqual({ location: 'outside' });
      });

      test('should return outside on error', async () => {
        vi.mocked(fs.readdir).mockRejectedValue(new Error('Fatal error'));

        const result = await detectContext('/test/root', '/test/root');

        expect(result).toEqual({ location: 'outside' });
      });
    });

    describe('root location', () => {
      test('should detect root location with available owners', async () => {
        vi.mocked(fs.readdir)
          .mockResolvedValueOnce(['owner1', 'owner2', '.gcpb'] as any)
          .mockResolvedValueOnce(['repo1'] as any)
          .mockResolvedValueOnce(['repo2'] as any);

        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

        const result = await detectContext('/test/root', '/test/root');

        expect(result).toEqual({
          location: 'root',
          availableOwners: ['owner1', 'owner2'],
        });
      });

      test('should skip .gcpb directory when detecting root', async () => {
        vi.mocked(fs.readdir)
          .mockResolvedValueOnce(['.gcpb', 'owner1'] as any)
          .mockResolvedValueOnce(['repo1'] as any);

        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

        const result = await detectContext('/test/root', '/test/root');

        expect(result.availableOwners).toEqual(['owner1']);
      });

      test('should skip owners with no repos', async () => {
        vi.mocked(fs.readdir)
          .mockResolvedValueOnce(['empty-owner', 'owner1'] as any)
          .mockResolvedValueOnce([] as any) // empty-owner has no repos
          .mockResolvedValueOnce(['repo1'] as any); // owner1 has repos

        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

        const result = await detectContext('/test/root', '/test/root');

        expect(result.availableOwners).toEqual(['owner1']);
      });

      test('should skip non-directory entries', async () => {
        vi.mocked(fs.readdir).mockResolvedValueOnce(['file.txt', 'owner1'] as any);

        vi.mocked(fs.stat).mockImplementation(async (path: any) => {
          if (path.toString().includes('file.txt')) {
            return { isDirectory: () => false } as any;
          }
          return { isDirectory: () => true } as any;
        });

        vi.mocked(fs.readdir).mockResolvedValueOnce(['repo1'] as any);

        const result = await detectContext('/test/root', '/test/root');

        expect(result.availableOwners).toEqual(['owner1']);
      });

      test('should skip owners with permission denied', async () => {
        vi.mocked(fs.readdir)
          .mockResolvedValueOnce(['denied', 'owner1'] as any)
          .mockResolvedValueOnce(['repo1'] as any);

        vi.mocked(fs.stat).mockImplementation(async (path: any) => {
          if (path.toString().includes('denied')) {
            const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
            throw error;
          }
          return { isDirectory: () => true } as any;
        });

        const result = await detectContext('/test/root', '/test/root');

        expect(result.availableOwners).toEqual(['owner1']);
      });

      test('should return root with no available owners when all are empty', async () => {
        vi.mocked(fs.readdir)
          .mockResolvedValueOnce(['owner1'] as any)
          .mockResolvedValueOnce([] as any); // owner1 has no repos

        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

        const result = await detectContext('/test/root', '/test/root');

        expect(result).toEqual({
          location: 'root',
        });
      });
    });

    describe('owner location', () => {
      test('should detect owner location with available repos', async () => {
        vi.mocked(fs.readdir)
          .mockResolvedValueOnce(['repo1', 'repo2'] as any)
          .mockResolvedValueOnce(['main'] as any)
          .mockResolvedValueOnce(['develop'] as any);

        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

        const result = await detectContext('/test/root', '/test/root/owner1');

        expect(result).toEqual({
          location: 'owner',
          owner: 'owner1',
          availableRepos: ['repo1', 'repo2'],
        });
      });

      test('should skip repos with no branches', async () => {
        vi.mocked(fs.readdir)
          .mockResolvedValueOnce(['empty-repo', 'repo1'] as any)
          .mockResolvedValueOnce([] as any) // empty-repo has no branches
          .mockResolvedValueOnce(['main'] as any); // repo1 has branches

        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

        const result = await detectContext('/test/root', '/test/root/owner1');

        expect(result.availableRepos).toEqual(['repo1']);
      });

      test('should skip non-directory entries at repo level', async () => {
        vi.mocked(fs.readdir).mockResolvedValueOnce(['file.txt', 'repo1'] as any);

        vi.mocked(fs.stat).mockImplementation(async (path: any) => {
          if (path.toString().includes('file.txt')) {
            return { isDirectory: () => false } as any;
          }
          return { isDirectory: () => true } as any;
        });

        vi.mocked(fs.readdir).mockResolvedValueOnce(['main'] as any);

        const result = await detectContext('/test/root', '/test/root/owner1');

        expect(result.availableRepos).toEqual(['repo1']);
      });

      test('should skip repos with permission denied', async () => {
        vi.mocked(fs.readdir).mockResolvedValueOnce(['denied', 'repo1'] as any);

        vi.mocked(fs.stat).mockImplementation(async (path: any) => {
          if (path.toString().includes('denied')) {
            const error = Object.assign(new Error('EPERM'), { code: 'EPERM' });
            throw error;
          }
          return { isDirectory: () => true } as any;
        });

        vi.mocked(fs.readdir).mockResolvedValueOnce(['main'] as any);

        const result = await detectContext('/test/root', '/test/root/owner1');

        expect(result.availableRepos).toEqual(['repo1']);
      });

      test('should return owner with no available repos when all are empty', async () => {
        vi.mocked(fs.readdir)
          .mockResolvedValueOnce(['repo1'] as any)
          .mockResolvedValueOnce([] as any);

        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

        const result = await detectContext('/test/root', '/test/root/owner1');

        expect(result).toEqual({
          location: 'owner',
          owner: 'owner1',
        });
      });
    });

    describe('repo location', () => {
      test('should detect repo location', async () => {
        const result = await detectContext('/test/root', '/test/root/owner1/repo1');

        expect(result).toEqual({
          location: 'repo',
          owner: 'owner1',
          repo: 'repo1',
        });
      });

      test('should handle repo names with special characters', async () => {
        const result = await detectContext('/test/root', '/test/root/owner1/my-repo.git');

        expect(result).toEqual({
          location: 'repo',
          owner: 'owner1',
          repo: 'my-repo.git',
        });
      });
    });

    describe('branch location', () => {
      test('should detect branch location', async () => {
        const result = await detectContext('/test/root', '/test/root/owner1/repo1/main');

        expect(result).toEqual({
          location: 'branch',
          owner: 'owner1',
          repo: 'repo1',
        });
      });

      test('should detect branch location with nested directories', async () => {
        const result = await detectContext(
          '/test/root',
          '/test/root/owner1/repo1/main/src/components'
        );

        expect(result).toEqual({
          location: 'branch',
          owner: 'owner1',
          repo: 'repo1',
        });
      });
    });

    describe('edge cases', () => {
      test('should handle current dir same as root (empty relative path)', async () => {
        vi.mocked(fs.readdir).mockResolvedValueOnce(['owner1'] as any);
        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(fs.readdir).mockResolvedValueOnce(['repo1'] as any);

        const result = await detectContext('/test/root', '/test/root');

        expect(result.location).toBe('root');
      });
    });
  });
});
