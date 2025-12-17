import { vi } from 'vitest';

/**
 * Mock execSync to return a successful git version
 */
export function mockExecSync(returnValue?: Buffer | string) {
  return vi.fn().mockReturnValue(returnValue || Buffer.from('git version 2.40.0'));
}

/**
 * Mock execSync to throw an error (e.g., command not found)
 */
export function mockExecSyncThrow(error: Error) {
  return vi.fn().mockImplementation(() => {
    throw error;
  });
}

/**
 * Mock spawn for cross-spawn
 * @param eventHandlers - Handlers for spawn events (error, spawn, close)
 */
export function mockSpawn(eventHandlers: {
  error?: () => void;
  spawn?: () => void;
  close?: (code: number) => void;
}) {
  const mockChild = {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (event === 'error' && eventHandlers.error) {
        setTimeout(eventHandlers.error, 0);
      }
      if (event === 'spawn' && eventHandlers.spawn) {
        setTimeout(eventHandlers.spawn, 0);
      }
      if (event === 'close' && eventHandlers.close) {
        setTimeout(() => eventHandlers.close!(0), 0);
      }
      return mockChild;
    }),
    unref: vi.fn(),
  };
  return vi.fn().mockReturnValue(mockChild);
}
