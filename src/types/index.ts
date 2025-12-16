export interface ParsedGitUrl {
  owner: string; // user or organization name
  repo: string; // repository name
  protocol: string; // ssh or https
  fullUrl: string; // original URL
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface CloneConfig {
  cloneUrl: string;
  baseBranch: string;
  targetBranch: string;
}

export interface CloneOptions {
  cloneUrl: string;
  baseBranch: string;
  targetBranch: string;
  cwd: string;
}

export interface CloneResult {
  success: boolean;
  targetPath: string;
  error?: Error;
}

export interface VSCodeOptions {
  targetPath: string;
}

export class CPBError extends Error {
  constructor(
    message: string,
    public suggestion?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CPBError';
  }
}
