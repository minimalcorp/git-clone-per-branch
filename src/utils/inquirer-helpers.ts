import * as readline from 'node:readline';
import { search, input, confirm, select, checkbox } from '@inquirer/prompts';
import { EscapeCancelError } from '../types/index.js';

// Extract config types from prompt function parameters
type SearchConfig<Value> = Parameters<typeof search<Value>>[0];
type InputConfig = Parameters<typeof input>[0];
type ConfirmConfig = Parameters<typeof confirm>[0];
type SelectConfig<Value> = Parameters<typeof select<Value>>[0];
type CheckboxConfig<Value> = Parameters<typeof checkbox<Value>>[0];

/**
 * Execute a prompt function with scroll region temporarily reset
 * This ensures prompts appear below the divider in REPL mode
 */
async function withPromptMode<T>(promptFn: () => Promise<T>): Promise<T> {
  if (!process.stdout.isTTY) {
    return promptFn();
  }

  // Dynamic import to avoid circular dependency
  const { terminalManager } = await import('./terminal.js');
  const { rows } = terminalManager.getTerminalSize();

  // Calculate REPL layout (same as initializeREPLLayout)
  const menuLines = 8;
  const dividerLine = rows - menuLines;
  const logLines = dividerLine - 1;
  const menuStartLine = dividerLine + 1;

  // Reset scroll region for prompt display
  terminalManager.resetScrollRegion();

  // Move to menu area (below divider)
  process.stdout.write(`\x1b[${menuStartLine};1H`);

  // Clear from cursor to end of screen
  process.stdout.write('\x1b[J');

  // Show cursor
  process.stdout.write('\x1b[?25h');

  try {
    // Execute prompt in unrestricted area
    const result = await promptFn();

    // Restore scroll region to log area
    terminalManager.setScrollRegion(1, logLines);

    // Move cursor back to log area
    process.stdout.write(`\x1b[${logLines};1H`);

    return result;
  } catch (error) {
    // Restore scroll region even on error
    terminalManager.setScrollRegion(1, logLines);
    process.stdout.write(`\x1b[${logLines};1H`);
    throw error;
  }
}

/**
 * Execute a long-running operation with processing indicator
 * Shows a spinner in menu area (REPL mode) during operation
 * @param message - Message to display during processing
 * @param processingFn - Async function to execute
 * @returns Result of processingFn
 */
export async function withProcessing<T>(
  message: string,
  processingFn: () => Promise<T>
): Promise<T> {
  if (!process.stdout.isTTY) {
    return processingFn();
  }

  // Dynamic import to avoid circular dependency
  const { terminalManager } = await import('./terminal.js');

  // Show processing indicator in menu area
  const cleanup = terminalManager.showProcessingInMenuArea(message);

  try {
    const result = await processingFn();
    cleanup();
    return result;
  } catch (error) {
    cleanup();
    throw error;
  }
}

/**
 * ESC キーリスナーをセットアップして AbortController を返す
 * ESC が押されたら controller.abort() を呼び出す
 */
function setupEscListener(controller: AbortController): () => void {
  readline.emitKeypressEvents(process.stdin);

  const listener = (_str: string, key: readline.Key) => {
    if (key && key.name === 'escape') {
      controller.abort(new Error('ESC_PRESSED'));
    }
  };

  process.stdin.on('keypress', listener);

  // クリーンアップ関数を返す
  return () => {
    process.stdin.off('keypress', listener);
  };
}

/**
 * エラーが ESC キーによるキャンセルかどうかをチェック
 */
function isEscapeAbort(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === 'AbortPromptError' &&
    error.cause instanceof Error &&
    error.cause.message === 'ESC_PRESSED'
  );
}

/**
 * search プロンプト（ESC キー対応）
 */
export async function searchWithEsc<Value>(config: SearchConfig<Value>): Promise<Value> {
  return withPromptMode(async () => {
    const controller = new AbortController();
    const cleanup = setupEscListener(controller);

    try {
      const result = await search<Value>(config, { signal: controller.signal });
      cleanup();
      return result;
    } catch (error: unknown) {
      cleanup();

      if (isEscapeAbort(error)) {
        throw new EscapeCancelError();
      }
      throw error;
    }
  });
}

/**
 * input プロンプト（ESC キー対応）
 */
export async function inputWithEsc(config: InputConfig): Promise<string> {
  return withPromptMode(async () => {
    const controller = new AbortController();
    const cleanup = setupEscListener(controller);

    try {
      const result = await input(config, { signal: controller.signal });
      cleanup();
      return result;
    } catch (error: unknown) {
      cleanup();

      if (isEscapeAbort(error)) {
        throw new EscapeCancelError();
      }
      throw error;
    }
  });
}

/**
 * confirm プロンプト（ESC キー対応）
 */
export async function confirmWithEsc(config: ConfirmConfig): Promise<boolean> {
  return withPromptMode(async () => {
    const controller = new AbortController();
    const cleanup = setupEscListener(controller);

    try {
      const result = await confirm(config, { signal: controller.signal });
      cleanup();
      return result;
    } catch (error: unknown) {
      cleanup();

      if (isEscapeAbort(error)) {
        throw new EscapeCancelError();
      }
      throw error;
    }
  });
}

/**
 * select プロンプト（ESC キー対応）
 */
export async function selectWithEsc<Value>(config: SelectConfig<Value>): Promise<Value> {
  return withPromptMode(async () => {
    const controller = new AbortController();
    const cleanup = setupEscListener(controller);

    try {
      const result = await select<Value>(config, { signal: controller.signal });
      cleanup();
      return result;
    } catch (error: unknown) {
      cleanup();

      if (isEscapeAbort(error)) {
        throw new EscapeCancelError();
      }
      throw error;
    }
  });
}

/**
 * checkbox プロンプト（ESC キー対応）
 */
export async function checkboxWithEsc<Value>(config: CheckboxConfig<Value>): Promise<Value[]> {
  return withPromptMode(async () => {
    const controller = new AbortController();
    const cleanup = setupEscListener(controller);

    try {
      const result = await checkbox<Value>(config, { signal: controller.signal });
      cleanup();
      return result;
    } catch (error: unknown) {
      cleanup();

      if (isEscapeAbort(error)) {
        throw new EscapeCancelError();
      }
      throw error;
    }
  });
}
