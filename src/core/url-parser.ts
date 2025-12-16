import gitUrlParse from 'git-url-parse';
import type { ParsedGitUrl } from '../types/index.js';
import { GCPBError } from '../types/index.js';

export function parseGitUrl(url: string): ParsedGitUrl {
  try {
    const parsed = gitUrlParse(url);

    if (!parsed.owner || !parsed.name) {
      throw new GCPBError(
        'Invalid Git URL format',
        'Please provide a valid Git URL in the format: https://github.com/user/repo.git or git@github.com:user/repo.git'
      );
    }

    // Remove .git suffix if present
    const repo = parsed.name.replace(/\.git$/, '');

    return {
      owner: parsed.owner,
      repo,
      protocol: parsed.protocol === 'ssh' ? 'ssh' : 'https',
      fullUrl: url,
    };
  } catch (error) {
    if (error instanceof GCPBError) {
      throw error;
    }
    throw new GCPBError(
      'Failed to parse Git URL',
      'Please provide a valid Git URL in the format: https://github.com/user/repo.git or git@github.com:user/repo.git',
      error instanceof Error ? error : undefined
    );
  }
}
