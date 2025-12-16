import inquirer from 'inquirer';
import type { CloneConfig } from '../types/index.js';
import { validateGitUrl, validateBranchName, sanitizeBranchName } from '../utils/validators.js';
import { parseGitUrl } from '../core/url-parser.js';
import path from 'path';

interface PromptAnswers {
  cloneUrl: string;
  baseBranch: string;
  targetBranch: string;
}

interface ConfirmAnswers {
  confirm: boolean;
}

export async function promptForCloneConfig(rootDir: string): Promise<CloneConfig> {
  const answers = await inquirer.prompt<PromptAnswers>([
    {
      type: 'input',
      name: 'cloneUrl',
      message: 'Enter the Git repository URL:',
      validate: (input: string) => {
        const validation = validateGitUrl(input);
        if (!validation.valid) {
          return validation.error || 'Invalid URL';
        }
        // Additional validation by trying to parse
        try {
          parseGitUrl(input);
          return true;
        } catch (error) {
          return error instanceof Error ? error.message : 'Failed to parse URL';
        }
      },
    },
    {
      type: 'input',
      name: 'baseBranch',
      message: 'Enter the base branch name:',
      default: 'main',
      validate: (input: string) => {
        // Allow origin/ prefix for remote branches
        const branchName = input.replace(/^origin\//, '');
        const validation = validateBranchName(branchName);
        return validation.valid || validation.error || 'Invalid branch name';
      },
    },
    {
      type: 'input',
      name: 'targetBranch',
      message: 'Enter the new branch name:',
      validate: (input: string) => {
        const validation = validateBranchName(input);
        return validation.valid || validation.error || 'Invalid branch name';
      },
    },
  ]);

  // Show confirmation of directory structure
  const parsed = parseGitUrl(answers.cloneUrl);
  const targetPath = path.join(
    rootDir,
    parsed.owner,
    parsed.repo,
    sanitizeBranchName(answers.targetBranch)
  );

  console.log('');
  console.log(`Repository will be cloned to:`);
  console.log(`  ${targetPath}`);
  console.log('');

  const { confirm } = await inquirer.prompt<ConfirmAnswers>([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      default: true,
    },
  ]);

  if (!confirm) {
    throw new Error('Operation cancelled by user');
  }

  return {
    cloneUrl: answers.cloneUrl,
    baseBranch: answers.baseBranch,
    targetBranch: answers.targetBranch,
  };
}
