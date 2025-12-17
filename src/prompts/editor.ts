import inquirer from 'inquirer';

/**
 * Prompts user for editor opening decision and whether to remember the choice
 */
export async function promptForEditorOpening(): Promise<{
  openInEditor: boolean;
  rememberChoice: boolean;
}> {
  // First prompt: Ask if user wants to open in VSCode
  const { openInEditor } = await inquirer.prompt<{ openInEditor: boolean }>([
    {
      type: 'confirm',
      name: 'openInEditor',
      message: 'Open in VSCode?',
      default: true,
    },
  ]);

  // Second prompt: Ask if user wants to remember this choice
  const { rememberChoice } = await inquirer.prompt<{ rememberChoice: boolean }>([
    {
      type: 'confirm',
      name: 'rememberChoice',
      message: "Remember this choice and don't ask again?",
      default: false,
    },
  ]);

  return {
    openInEditor,
    rememberChoice,
  };
}
