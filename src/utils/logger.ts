import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import boxen from 'boxen';

export class Logger {
  private spinner: Ora | null = null;

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✔'), message);
  }

  error(message: string): void {
    console.error(chalk.red('✖'), message);
  }

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  stopSpinner(success: boolean, message: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;

      // Ensure terminal is in a clean state after spinner
      // This helps prevent state issues when spinners stop before prompts
      if (process.stdout.isTTY) {
        process.stdout.write('\x1b[?25h'); // Show cursor
      }
    }
  }

  box(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const borderColors = {
      info: 'blue',
      success: 'green',
      error: 'red',
    } as const;

    console.log(
      boxen(message, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: borderColors[type],
      })
    );
  }
}
