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
}

/**
 * input プロンプト（ESC キー対応）
 */
export async function inputWithEsc(config: InputConfig): Promise<string> {
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
}

/**
 * confirm プロンプト（ESC キー対応）
 */
export async function confirmWithEsc(config: ConfirmConfig): Promise<boolean> {
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
}

/**
 * select プロンプト（ESC キー対応）
 */
export async function selectWithEsc<Value>(config: SelectConfig<Value>): Promise<Value> {
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
}

/**
 * checkbox プロンプト（ESC キー対応）
 */
export async function checkboxWithEsc<Value>(config: CheckboxConfig<Value>): Promise<Value[]> {
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
}
