import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  findRoot,
  initializeConfig,
  loadConfig,
  cleanupEmptyDirectories,
} from '../../../src/core/config.js';
import { GCPBError } from '../../../src/types/index.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('config', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    vi.resetAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('findRoot', () => {
    test('should find .gcpb directory in current directory', async () => {
      vi.mocked(fs.realpath).mockResolvedValue('/home/user/project');
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      const result = await findRoot('/home/user/project');

      expect(result).toBe('/home/user/project');
      expect(fs.stat).toHaveBeenCalledWith('/home/user/project/.gcpb');
    });

    test('should find .gcpb directory in parent directory', async () => {
      vi.mocked(fs.realpath).mockResolvedValue('/home/user/project/subdir');

      let callCount = 0;
      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        callCount++;
        if (callCount === 1) {
          // First call: subdir/.gcpb doesn't exist
          const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
          throw error;
        }
        // Second call: project/.gcpb exists
        return { isDirectory: () => true } as any;
      });

      const result = await findRoot('/home/user/project/subdir');

      expect(result).toBe('/home/user/project');
    });

    test('should find .gcpb directory multiple levels up', async () => {
      vi.mocked(fs.realpath).mockResolvedValue('/home/user/project/dir1/dir2/dir3');

      let callCount = 0;
      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        callCount++;
        if (callCount < 4) {
          const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
          throw error;
        }
        return { isDirectory: () => true } as any;
      });

      const result = await findRoot('/home/user/project/dir1/dir2/dir3');

      // After 3 ENOENT errors, the 4th call succeeds at /home/user/project
      expect(result).toBe('/home/user/project');
    });

    test('should return null when .gcpb directory not found', async () => {
      vi.mocked(fs.realpath).mockResolvedValue('/');
      vi.mocked(fs.stat).mockImplementation(async () => {
        const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        throw error;
      });

      const result = await findRoot('/');

      expect(result).toBeNull();
    });

    test('should skip directories with permission denied', async () => {
      vi.mocked(fs.realpath).mockResolvedValue('/home/user/denied/project');

      let callCount = 0;
      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        callCount++;
        if (callCount === 1) {
          // project/.gcpb: permission denied
          const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
          throw error;
        } else if (callCount === 2) {
          // denied/.gcpb: not found
          const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
          throw error;
        }
        // user/.gcpb: found
        return { isDirectory: () => true } as any;
      });

      const result = await findRoot('/home/user/denied/project');

      expect(result).toBe('/home/user');
    });

    test('should throw GCPBError on unexpected errors', async () => {
      vi.mocked(fs.realpath).mockRejectedValue(new Error('Unexpected error'));

      await expect(findRoot('/path')).rejects.toThrow(GCPBError);
      await expect(findRoot('/path')).rejects.toThrow('Failed to search for .gcpb directory');
    });
  });

  describe('initializeConfig', () => {
    test('should create .gcpb directory and settings.json', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      const result = await initializeConfig('/home/user/project');

      expect(result).toBe('/home/user/project');
      expect(fs.pathExists).toHaveBeenCalledWith('/home/user/project/.gcpb');
      expect(fs.ensureDir).toHaveBeenCalledWith('/home/user/project/.gcpb');
      expect(fs.writeJson).toHaveBeenCalledWith(
        '/home/user/project/.gcpb/settings.json',
        expect.objectContaining({
          version: '1.0.0',
          createdAt: expect.any(String),
        }),
        { spaces: 2 }
      );
    });

    test('should throw GCPBError if .gcpb already exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);

      await expect(initializeConfig('/home/user/project')).rejects.toThrow(GCPBError);
      await expect(initializeConfig('/home/user/project')).rejects.toThrow(
        '.gcpb directory already exists'
      );
    });

    test('should throw GCPBError on write permission error', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.ensureDir).mockRejectedValue(
        Object.assign(new Error('EACCES'), { code: 'EACCES' })
      );

      await expect(initializeConfig('/home/user/denied')).rejects.toThrow(GCPBError);
      await expect(initializeConfig('/home/user/denied')).rejects.toThrow(
        'Failed to initialize configuration'
      );
    });
  });

  describe('loadConfig', () => {
    test('should load valid configuration', async () => {
      const mockConfig = {
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(fs.readJson).mockResolvedValue(mockConfig);

      const result = await loadConfig('/home/user/project');

      expect(result).toEqual(mockConfig);
      expect(fs.readJson).toHaveBeenCalledWith('/home/user/project/.gcpb/settings.json');
    });

    test('should throw GCPBError if version field is missing', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({ createdAt: '2024-01-01T00:00:00.000Z' });

      await expect(loadConfig('/home/user/project')).rejects.toThrow(GCPBError);
      await expect(loadConfig('/home/user/project')).rejects.toThrow('Invalid configuration file');
    });

    test('should throw GCPBError if settings.json does not exist', async () => {
      vi.mocked(fs.readJson).mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      await expect(loadConfig('/home/user/project')).rejects.toThrow(GCPBError);
      await expect(loadConfig('/home/user/project')).rejects.toThrow(
        'Failed to load configuration'
      );
    });

    test('should throw GCPBError on JSON parse error', async () => {
      vi.mocked(fs.readJson).mockRejectedValue(new Error('Invalid JSON'));

      await expect(loadConfig('/home/user/project')).rejects.toThrow(GCPBError);
      await expect(loadConfig('/home/user/project')).rejects.toThrow(
        'Failed to load configuration'
      );
    });
  });

  describe('cleanupEmptyDirectories', () => {
    test('should remove empty repo and owner directories', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any)
        .mockResolvedValueOnce([] as any) // repo1 is empty
        .mockResolvedValueOnce([] as any); // owner1 is empty after removing repo1

      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      await cleanupEmptyDirectories('/test/root');

      expect(fs.remove).toHaveBeenCalledWith('/test/root/owner1/repo1');
      expect(fs.remove).toHaveBeenCalledWith('/test/root/owner1');
    });

    test('should keep non-empty directories', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any)
        .mockResolvedValueOnce(['main'] as any) // repo1 has branches
        .mockResolvedValueOnce(['repo1'] as any); // owner1 still has repo1

      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      await cleanupEmptyDirectories('/test/root');

      expect(fs.remove).not.toHaveBeenCalled();
    });

    test('should skip .gcpb directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['.gcpb', 'owner1'] as any);

      await cleanupEmptyDirectories('/test/root');

      expect(fs.stat).not.toHaveBeenCalledWith('/test/root/.gcpb');
    });

    test('should skip non-directory entries at owner level', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['file.txt', 'owner1'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        if (path.toString().includes('file.txt')) {
          return { isDirectory: () => false } as any;
        }
        return { isDirectory: () => true } as any;
      });

      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['file.txt', 'owner1'] as any)
        .mockResolvedValueOnce(['repo1'] as any)
        .mockResolvedValueOnce(['main'] as any)
        .mockResolvedValueOnce(['repo1'] as any);

      await cleanupEmptyDirectories('/test/root');

      expect(fs.remove).not.toHaveBeenCalled();
    });

    test('should skip non-directory entries at repo level', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1'] as any)
        .mockResolvedValueOnce(['file.txt', 'repo1'] as any)
        .mockResolvedValueOnce(['main'] as any)
        .mockResolvedValueOnce(['repo1'] as any);

      vi.mocked(fs.stat).mockImplementation(async (path: any) => {
        if (path.toString().includes('file.txt')) {
          return { isDirectory: () => false } as any;
        }
        return { isDirectory: () => true } as any;
      });

      await cleanupEmptyDirectories('/test/root');

      expect(fs.remove).not.toHaveBeenCalled();
    });

    test('should not throw error on cleanup failure', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

      await expect(cleanupEmptyDirectories('/test/root')).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: Failed to cleanup empty directories:',
        expect.any(Error)
      );
    });

    test('should handle complex directory structure', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['owner1', 'owner2'] as any)
        // owner1
        .mockResolvedValueOnce(['repo1', 'repo2'] as any)
        .mockResolvedValueOnce([] as any) // repo1 empty
        .mockResolvedValueOnce(['main'] as any) // repo2 has main
        .mockResolvedValueOnce(['repo2'] as any) // owner1 has repo2 left
        // owner2
        .mockResolvedValueOnce(['repo3'] as any)
        .mockResolvedValueOnce([] as any) // repo3 empty
        .mockResolvedValueOnce([] as any); // owner2 empty

      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      await cleanupEmptyDirectories('/test/root');

      expect(fs.remove).toHaveBeenCalledWith('/test/root/owner1/repo1');
      expect(fs.remove).toHaveBeenCalledWith('/test/root/owner2/repo3');
      expect(fs.remove).toHaveBeenCalledWith('/test/root/owner2');
      expect(fs.remove).not.toHaveBeenCalledWith('/test/root/owner1');
    });
  });
});
