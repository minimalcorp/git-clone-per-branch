import { spawn } from 'cross-spawn';
import type { TerminalOptions } from '../types/index.js';

export async function openInTerminal(options: TerminalOptions): Promise<boolean> {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      return openInMacTerminal(options.targetPath);
    case 'linux':
      return openInLinuxTerminal(options.targetPath);
    case 'win32':
      return openInWindowsTerminal(options.targetPath);
    default:
      return false;
  }
}

async function openInMacTerminal(targetPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('open', ['-a', 'Terminal', targetPath], {
      stdio: 'ignore',
      detached: true,
    });

    child.on('error', () => resolve(false));
    child.on('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}

async function openInLinuxTerminal(targetPath: string): Promise<boolean> {
  const terminals = [
    { name: 'gnome-terminal', args: ['--working-directory', targetPath] },
    { name: 'konsole', args: ['--workdir', targetPath] },
    { name: 'xfce4-terminal', args: ['--working-directory', targetPath] },
    { name: 'xterm', args: ['-e', `cd "${targetPath}" && exec $SHELL`] },
  ];

  for (const terminal of terminals) {
    const success = await trySpawnTerminal(terminal.name, terminal.args);
    if (success) return true;
  }

  return false;
}

async function openInWindowsTerminal(targetPath: string): Promise<boolean> {
  const commands = [
    { cmd: 'wt.exe', args: ['-d', targetPath] },
    { cmd: 'cmd.exe', args: ['/K', `cd /d "${targetPath}"`] },
  ];

  for (const { cmd, args } of commands) {
    const success = await trySpawnTerminal(cmd, args, { shell: true });
    if (success) return true;
  }

  return false;
}

function trySpawnTerminal(
  command: string,
  args: string[],
  options?: { shell: boolean }
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const child = spawn(command, args, {
        stdio: 'ignore',
        detached: true,
        shell: options?.shell,
      });

      child.on('error', () => resolve(false));
      child.on('spawn', () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}
