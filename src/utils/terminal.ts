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
  private scrollRegionActive = false;

  /**
   * Set scroll region using DECSTBM (DEC Set Top and Bottom Margins)
   * @param topLine - Top line of scroll region (1-based)
   * @param bottomLine - Bottom line of scroll region
   */
  setScrollRegion(topLine: number, bottomLine: number): void {
    if (!process.stdout.isTTY) return;

    // ESC [ top ; bottom r
    process.stdout.write(`\x1b[${topLine};${bottomLine}r`);
    this.scrollRegionActive = true;
  }

  /**
   * Reset scroll region to full screen
   */
  resetScrollRegion(): void {
    if (!process.stdout.isTTY) return;

    // ESC [ r (no parameters = full screen)
    process.stdout.write('\x1b[r');
    this.scrollRegionActive = false;
  }

  /**
   * Get terminal size
   */
  getTerminalSize(): { rows: number; columns: number } {
    if (process.stdout.isTTY) {
      return {
        rows: process.stdout.rows || 24,
        columns: process.stdout.columns || 80,
      };
    }
    return { rows: 24, columns: 80 };
  }

  /**
   * Initialize REPL layout with scroll region
   * Returns line numbers for different areas
   */
  initializeREPLLayout(): { logLines: number; dividerLine: number; menuStartLine: number } {
    const { rows } = this.getTerminalSize();

    // Reserve lines: menu needs ~8 lines for Inquirer prompt
    const menuLines = 8;
    const dividerLine = rows - menuLines;
    const logLines = dividerLine - 1;

    // Set scroll region to log area only
    this.setScrollRegion(1, logLines);

    // Move cursor to end of log area
    process.stdout.write(`\x1b[${logLines};1H`);

    return {
      logLines,
      dividerLine,
      menuStartLine: dividerLine + 1,
    };
  }

  /**
   * Draw content at fixed line (outside scroll region)
   */
  drawFixedLine(line: number, content: string): void {
    if (!process.stdout.isTTY) return;

    // Save cursor position
    process.stdout.write('\x1b7');

    // Move to line
    process.stdout.write(`\x1b[${line};1H`);

    // Clear line and write content
    process.stdout.write('\x1b[2K');
    process.stdout.write(content);

    // Restore cursor position
    process.stdout.write('\x1b8');
  }

  /**
   * Exit REPL mode cleanly with a message at bottom of terminal
   * Ensures the message appears below all UI elements
   */
  exitWithMessage(message: string): void {
    if (!process.stdout.isTTY) {
      console.log(message);
      return;
    }

    // Reset scroll region to full screen
    this.resetScrollRegion();

    // Move cursor to terminal bottom
    const { rows } = this.getTerminalSize();
    process.stdout.write(`\x1b[${rows};1H\n`);

    // Print message
    console.log(message);
  }

  /**
   * Show processing indicator in menu area (REPL mode only)
   * Displays a message in the menu area and hides the cursor
   * @param message - Processing message to display
   * @returns Cleanup function to hide the indicator
   */
  showProcessingInMenuArea(message: string): () => void {
    if (!process.stdout.isTTY) {
      return () => {}; // No-op for non-TTY
    }

    const { rows } = this.getTerminalSize();
    const menuLines = 8;
    const dividerLine = rows - menuLines;
    const menuStartLine = dividerLine + 1;

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    // Show processing message in menu area (using drawFixedLine pattern)
    this.drawFixedLine(menuStartLine, `⠋ ${message}`);

    // Return cleanup function
    return () => {
      // Clear menu area
      this.drawFixedLine(menuStartLine, '');
      // Show cursor
      process.stdout.write('\x1b[?25h');
    };
  }

  /**
   * Restore terminal to normal state
   * This fixes the scroll-up issue when using @inquirer/prompts
   */
  cleanup(): void {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    try {
      // Reset scroll region first
      this.resetScrollRegion();

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
