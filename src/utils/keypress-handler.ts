/**
 * Minimal keypress handler for ESC key detection
 *
 * Note: Full ESC key handling (startListening/stopListening) is deferred
 * to a future implementation. This simplified version only provides error
 * checking functionality for state functions.
 */

export class KeypressHandler {
  private escapePressed = false;

  /**
   * Check if ESC was pressed and throw error if so
   * This also resets the flag after checking
   */
  checkAndThrow(): void {
    if (this.escapePressed) {
      this.escapePressed = false;
      throw new Error('ESC key pressed');
    }
  }
}

// Singleton instance
export const keypressHandler = new KeypressHandler();
