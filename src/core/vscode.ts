import { spawn } from 'cross-spawn';
import type { VSCodeOptions } from '../types/index.js';

export async function openInVSCode(options: VSCodeOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Try to open with 'code' command
    const child = spawn('code', [options.targetPath], {
      stdio: 'ignore',
      detached: true,
    });

    child.on('error', () => {
      // 'code' command not found
      resolve(false);
    });

    child.on('spawn', () => {
      // Successfully spawned
      child.unref();
      resolve(true);
    });
  });
}
