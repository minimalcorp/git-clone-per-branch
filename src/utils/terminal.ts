import readline from 'readline';

/**
 * Terminal state management and cleanup utility
 * Handles restoration of terminal state when process exits
 *
 * This fixes terminal scrolling issues that occur when using interactive
 * prompts (like @inquirer/prompts) which manipulate terminal state
 * (alternate screen buffer, scroll regions, cursor positioning).
 */
class TerminalManager {
  private cleanupRegistered = false;
  private isCleaningUp = false;

  /**
   * Restore terminal to normal state
   * This fixes the scroll-up issue when using @inquirer/prompts
   */
  cleanup(): void {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    try {
      // Only perform cleanup in TTY environments
      if (process.stdout.isTTY) {
        // Exit alternate screen buffer (if active)
        process.stdout.write('\x1b[?1049l');

        // Reset scroll region to full screen
        process.stdout.write('\x1b[r');

        // Move cursor to bottom of screen
        process.stdout.write('\x1b[9999;1H');

        // Show cursor (in case it was hidden)
        process.stdout.write('\x1b[?25h');

        // Clear from cursor to end of screen
        readline.clearScreenDown(process.stdout);
      }
    } catch (_error: unknown) {
      // Silently fail - we're likely exiting anyway
      // and throwing here could prevent normal exit
    }
  }

  /**
   * Register cleanup handlers for all exit scenarios
   * Call this once at application startup
   */
  registerCleanupHandlers(): void {
    if (this.cleanupRegistered) return;
    this.cleanupRegistered = true;

    // Normal exit (runs for all exit scenarios)
    process.once('exit', () => {
      this.cleanup();
    });

    // Uncaught exceptions
    process.once('uncaughtException', (error) => {
      this.cleanup();
      console.error('Uncaught exception:', error);
      process.exit(1);
    });

    // Unhandled promise rejections
    process.once('unhandledRejection', (reason) => {
      this.cleanup();
      console.error('Unhandled rejection:', reason);
      process.exit(1);
    });
  }
}

// Singleton instance
export const terminalManager = new TerminalManager();
