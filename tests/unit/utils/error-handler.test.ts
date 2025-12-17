import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleError } from '../../../src/utils/error-handler.js';
import { GCPBError } from '../../../src/types/index.js';
import type { Logger } from '../../../src/utils/logger.js';

describe('error-handler', () => {
  let mockLogger: Logger;
  let consoleErrorSpy: any;
  const originalDebug = process.env.DEBUG;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      box: vi.fn(),
      spinner: vi.fn(),
    } as unknown as Logger;

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.DEBUG = originalDebug;
  });

  describe('GCPBError handling', () => {
    test('should handle GCPBError with message', () => {
      const error = new GCPBError('Test error');

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error');
    });

    test('should display suggestion when available', () => {
      const error = new GCPBError('Test error', 'Test suggestion');

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error');
      expect(mockLogger.info).toHaveBeenCalledWith('Suggestion: Test suggestion');
    });

    test('should show original error in DEBUG mode', () => {
      process.env.DEBUG = '1';
      const originalError = new Error('Original error');
      const error = new GCPBError('Wrapped error', 'Suggestion', originalError);

      handleError(error, mockLogger);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\nOriginal error:', originalError);
    });

    test('should not show original error when DEBUG is not set', () => {
      delete process.env.DEBUG;
      const originalError = new Error('Original error');
      const error = new GCPBError('Wrapped error', 'Suggestion', originalError);

      handleError(error, mockLogger);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Node.js error codes', () => {
    test('should handle EACCES error', () => {
      const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Permission denied');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('write permissions'));
    });

    test('should handle EPERM error', () => {
      const error = Object.assign(new Error('Operation not permitted'), { code: 'EPERM' });

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Permission denied');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('write permissions'));
    });

    test('should handle EEXIST error', () => {
      const error = Object.assign(new Error('File exists'), { code: 'EEXIST' });

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Directory already exists');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('different branch name')
      );
    });

    test('should handle ENOSPC error', () => {
      const error = Object.assign(new Error('No space left'), { code: 'ENOSPC' });

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Insufficient disk space');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('free up space'));
    });

    test('should handle ENOTFOUND error', () => {
      const error = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Network error: Failed to connect to the remote repository'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('internet connection'));
    });

    test('should handle ETIMEDOUT error', () => {
      const error = Object.assign(new Error('Connection timed out'), { code: 'ETIMEDOUT' });

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Network error: Failed to connect to the remote repository'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('internet connection'));
    });

    test('should handle unknown error code', () => {
      const error = Object.assign(new Error('Unknown error'), { code: 'EUNKNOWN' });

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Unknown error');
    });
  });

  describe('Git error messages', () => {
    test('should handle SSH authentication error', () => {
      const error = new Error(
        'Permission denied (publickey) for ssh://git@github.com/user/repo.git'
      );

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('SSH key is configured')
      );
    });

    test('should handle HTTPS authentication error', () => {
      const error = new Error('Authentication failed for https://github.com/user/repo.git');

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('check your credentials')
      );
    });

    test('should handle repository not found error', () => {
      const error = new Error('Repository not found: https://github.com/user/repo.git');

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Repository not found');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('repository URL'));
    });

    test('should handle branch not found error', () => {
      const error = new Error('Branch not found: feature/test');

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Base branch not found in the repository');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Common branches: main, master, develop')
      );
    });

    test('should handle generic Error without special patterns', () => {
      const error = new Error('Some generic error');

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('Some generic error');
    });
  });

  describe('DEBUG mode', () => {
    test('should show stack trace in DEBUG mode for Error', () => {
      process.env.DEBUG = '1';
      const error = new Error('Test error');

      handleError(error, mockLogger);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\nStack trace:', error.stack);
    });

    test('should not show stack trace when DEBUG is not set', () => {
      delete process.env.DEBUG;
      const error = new Error('Test error');

      handleError(error, mockLogger);

      expect(consoleErrorSpy).not.toHaveBeenCalledWith('\nStack trace:', expect.anything());
    });

    test('should show error details in DEBUG mode for unknown error', () => {
      process.env.DEBUG = '1';
      const error = 'string error';

      handleError(error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('An unknown error occurred');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError details:', error);
    });
  });

  describe('Unknown error types', () => {
    test('should handle string error', () => {
      handleError('string error', mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('An unknown error occurred');
    });

    test('should handle null error', () => {
      handleError(null, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('An unknown error occurred');
    });

    test('should handle undefined error', () => {
      handleError(undefined, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('An unknown error occurred');
    });

    test('should handle object error', () => {
      handleError({ message: 'object error' }, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('An unknown error occurred');
    });
  });
});
