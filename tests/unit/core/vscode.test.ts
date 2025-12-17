import { describe, test, expect, vi, beforeEach } from 'vitest';
import { openInVSCode } from '../../../src/core/editor.js';
import { spawn } from 'cross-spawn';

vi.mock('cross-spawn');

describe('vscode', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('openInVSCode', () => {
    test('should return true when code command spawns successfully', async () => {
      const mockChild = {
        on: vi.fn((event, handler) => {
          if (event === 'spawn') {
            // Call spawn handler immediately
            setImmediate(handler);
          }
          return mockChild;
        }),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChild as any);

      const result = await openInVSCode({ targetPath: '/path/to/project' });

      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledWith('code', ['/path/to/project'], {
        stdio: 'ignore',
        detached: true,
      });
    });

    test('should return false when code command is not found', async () => {
      const mockChild = {
        on: vi.fn((event, handler) => {
          if (event === 'error') {
            // Call error handler immediately
            setImmediate(handler);
          }
          return mockChild;
        }),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChild as any);

      const result = await openInVSCode({ targetPath: '/path/to/project' });

      expect(result).toBe(false);
    });

    test('should handle different target paths', async () => {
      const mockChild = {
        on: vi.fn((event, handler) => {
          if (event === 'spawn') {
            setImmediate(handler);
          }
          return mockChild;
        }),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChild as any);

      await openInVSCode({ targetPath: '/home/user/my-project' });

      expect(spawn).toHaveBeenCalledWith('code', ['/home/user/my-project'], {
        stdio: 'ignore',
        detached: true,
      });
    });

    test('should handle paths with spaces', async () => {
      const mockChild = {
        on: vi.fn((event, handler) => {
          if (event === 'spawn') {
            setImmediate(handler);
          }
          return mockChild;
        }),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChild as any);

      await openInVSCode({ targetPath: '/path/with spaces/project' });

      expect(spawn).toHaveBeenCalledWith('code', ['/path/with spaces/project'], {
        stdio: 'ignore',
        detached: true,
      });
    });

    test('should use detached mode', async () => {
      const mockChild = {
        on: vi.fn((event, handler) => {
          if (event === 'spawn') {
            setImmediate(handler);
          }
          return mockChild;
        }),
        unref: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChild as any);

      await openInVSCode({ targetPath: '/path/to/project' });

      expect(spawn).toHaveBeenCalledWith('code', expect.any(Array), {
        stdio: 'ignore',
        detached: true,
      });
    });
  });
});
