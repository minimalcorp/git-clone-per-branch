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
  rootDir: string; // changed from cwd
}

export interface CloneResult {
  success: boolean;
  targetPath: string;
  error?: Error;
}

export interface VSCodeOptions {
  targetPath: string;
}

export class GCPBError extends Error {
  constructor(
    message: string,
    public suggestion?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GCPBError';
  }
}

// Configuration interfaces
export interface Config {
  version: string;
  createdAt?: string;
}

// Repository scanner interfaces
export interface RepositoryInfo {
  owner: string;
  repo: string;
  branches: string[];
  fullPath: string;
}

export interface RemovalSelection {
  path: string;
  label: string;
}

// Context detection interfaces
export interface ContextInfo {
  location: 'root' | 'owner' | 'repo' | 'branch' | 'outside';
  owner?: string;
  repo?: string;
  availableRepos?: string[];
  availableOwners?: string[];
}

export interface RemoteUrlResult {
  found: boolean;
  url?: string;
  source?: string;
}
