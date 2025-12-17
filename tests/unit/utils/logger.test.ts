import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../../src/utils/logger.js';
import ora from 'ora';

vi.mock('ora');

describe('logger', () => {
  let logger: Logger;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    logger = new Logger();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('info', () => {
    test('should log info message with blue icon', () => {
      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), 'Test message');
      // The first argument should contain the blue info icon
      expect(consoleLogSpy.mock.calls[0][0]).toContain('ℹ');
    });

    test('should log multiple info messages', () => {
      logger.info('Message 1');
      logger.info('Message 2');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('success', () => {
    test('should log success message with green checkmark', () => {
      logger.success('Operation successful');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), 'Operation successful');
      // The first argument should contain the green checkmark
      expect(consoleLogSpy.mock.calls[0][0]).toContain('✔');
    });
  });

  describe('error', () => {
    test('should log error message with red X', () => {
      logger.error('Something went wrong');

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), 'Something went wrong');
      // The first argument should contain the red X
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('✖');
    });

    test('should use console.error instead of console.log', () => {
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    test('should log warning message with yellow warning icon', () => {
      logger.warn('This is a warning');

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.any(String), 'This is a warning');
      // The first argument should contain the yellow warning icon
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('⚠');
    });

    test('should use console.warn instead of console.log', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('spinner', () => {
    test('should start spinner with message', () => {
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      vi.mocked(ora).mockReturnValue(mockSpinner as any);

      logger.startSpinner('Loading...');

      expect(ora).toHaveBeenCalledWith('Loading...');
      expect(mockSpinner.start).toHaveBeenCalledOnce();
    });

    test('should update spinner text', () => {
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      vi.mocked(ora).mockReturnValue(mockSpinner as any);

      logger.startSpinner('Loading...');
      logger.updateSpinner('Still loading...');

      expect(mockSpinner.text).toBe('Still loading...');
    });

    test('should not update spinner if not started', () => {
      logger.updateSpinner('Should not update');

      // Should not throw error
      expect(true).toBe(true);
    });

    test('should stop spinner with success', () => {
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      vi.mocked(ora).mockReturnValue(mockSpinner as any);

      logger.startSpinner('Loading...');
      logger.stopSpinner(true, 'Done!');

      expect(mockSpinner.succeed).toHaveBeenCalledWith('Done!');
      expect(mockSpinner.fail).not.toHaveBeenCalled();
    });

    test('should stop spinner with failure', () => {
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      vi.mocked(ora).mockReturnValue(mockSpinner as any);

      logger.startSpinner('Loading...');
      logger.stopSpinner(false, 'Failed!');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed!');
      expect(mockSpinner.succeed).not.toHaveBeenCalled();
    });

    test('should not throw if stopping spinner that was not started', () => {
      logger.stopSpinner(true, 'Should not throw');

      // Should not throw error
      expect(true).toBe(true);
    });

    test('should clear spinner reference after stopping', () => {
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      vi.mocked(ora).mockReturnValue(mockSpinner as any);

      logger.startSpinner('Loading...');
      logger.stopSpinner(true, 'Done!');

      // Updating after stop should do nothing
      logger.updateSpinner('Should not update');
      expect(mockSpinner.text).toBe('');
    });

    test('should support full spinner lifecycle', () => {
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      vi.mocked(ora).mockReturnValue(mockSpinner as any);

      logger.startSpinner('Step 1');
      expect(ora).toHaveBeenCalledWith('Step 1');
      expect(mockSpinner.start).toHaveBeenCalled();

      logger.updateSpinner('Step 2');
      expect(mockSpinner.text).toBe('Step 2');

      logger.updateSpinner('Step 3');
      expect(mockSpinner.text).toBe('Step 3');

      logger.stopSpinner(true, 'All steps completed');
      expect(mockSpinner.succeed).toHaveBeenCalledWith('All steps completed');
    });
  });

  describe('box', () => {
    test('should display boxed message with default info style', () => {
      logger.box('Important message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      // The output should contain the message
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Important message');
    });

    test('should display boxed message with success style', () => {
      logger.box('Success message', 'success');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Success message');
    });

    test('should display boxed message with error style', () => {
      logger.box('Error message', 'error');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Error message');
    });

    test('should support multiline messages in box', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      logger.box(multilineMessage);

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 2');
      expect(output).toContain('Line 3');
    });
  });

  describe('integration', () => {
    test('should support combining different log methods', () => {
      logger.info('Starting process');
      logger.success('Step 1 complete');
      logger.warn('Step 2 had warnings');
      logger.error('Step 3 failed');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // info and success
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('should support mixing spinner and regular logs', () => {
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      vi.mocked(ora).mockReturnValue(mockSpinner as any);

      logger.info('Before spinner');
      logger.startSpinner('Processing...');
      logger.updateSpinner('Still processing...');
      logger.stopSpinner(true, 'Processing complete');
      logger.success('After spinner');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // info and success
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });
  });
});
