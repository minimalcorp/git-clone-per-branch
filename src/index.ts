// Export programmatic API for use as a library
export { cloneRepository } from './core/clone.js';
export { parseGitUrl } from './core/url-parser.js';
export { openInVSCode, handleEditorOpening } from './core/editor.js';
export type { CloneOptions, CloneResult, ParsedGitUrl, VSCodeOptions } from './types/index.js';
