/**
 * CLI argument parsing utilities
 * Converts Commander.js arguments into structured data for orchestrators
 */

/**
 * Parsed arguments for path-based commands (rm/open)
 */
export interface ParsedPathArgs {
  org?: string;
  repo?: string;
  branch?: string;
  isComplete: boolean; // true if org/repo/branch all provided
}

/**
 * Parse a path argument into org/repo/branch components
 *
 * Supported formats:
 * - "org" → { org: "org" }
 * - "org/repo" → { org: "org", repo: "repo" }
 * - "org/repo/branch" → { org: "org", repo: "repo", branch: "branch" }
 *
 * @param path - Path string in format "org" or "org/repo" or "org/repo/branch"
 * @returns Parsed path components
 */
export function parsePathArg(path?: string): ParsedPathArgs {
  if (!path) {
    return { isComplete: false };
  }

  // Split by forward slash
  const parts = path.split('/').filter((p) => p.length > 0);

  const org = parts[0];
  const repo = parts[1];
  const branch = parts[2];

  // Path is complete if all three components are present
  const isComplete = !!(org && repo && branch);

  return {
    org,
    repo,
    branch,
    isComplete,
  };
}
