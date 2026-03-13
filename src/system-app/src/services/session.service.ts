import { randomUUID } from 'crypto';
import { LocalSession } from '../types/session.types';
import { nowIso } from '../utils/time';

/**
 * Service for managing user sessions.
 * This service provides methods to start a new session, get the current session, update the session's last updated time, and enable/disable monitoring for the session.
 * The session information is stored in memory and includes a unique session ID, creation time, last updated time, and a flag indicating whether monitoring is enabled.
 * @class SessionService - The SessionService class provides methods to manage user sessions.
 * @method startSession() - Starts a new session and returns the session information.
 * @method getSession() - Returns the current session information, or null if no session is active.
 * @method touchSession() - Updates the last updated time of the current session to the current time.
 * @method setMonitoringEnabled(enabled: boolean) - Enables or disables monitoring for the current session and returns the updated session information, or null if no session is active.
 */
class SessionService {
  // In the following few lines we create a singleton service so that way only one instance of the SessionService class exists throughout the applications lifecycle.
  private static instance: SessionService;
  private constructor() { }
  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }
  private currentSession: LocalSession | null = null;

  /**
   * Starts a new session by generating a unique session ID and setting the creation and last updated times to the current time. The monitoring is enabled by default when a new session is started. The session information is stored in memory and returned to the caller.
   * @returns {LocalSession} The session information for the newly started session, including the session ID, creation time, last updated time, and monitoring enabled flag.
   */
  startSession(): LocalSession {
    const timestamp = nowIso();
    const sessionId = `session-${randomUUID()}`;
    this.currentSession = {
      sessionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      isMonitoringEnabled: true
    };
    return this.currentSession;
  }

  /**
   * Returns the current session information, or null if no session is active. The session information includes the session ID, creation time, last updated time, and monitoring enabled flag.
   * @returns {LocalSession | null} The current session information, or null if no session is active.
   */
  get session(): LocalSession | null {
    return this.currentSession!;
  }
  /**
   * Updates the last updated time of the current session to the current time. This method is useful for keeping track of when the session was last active. If no session is active, this method does nothing.
   * @returns {void}
   */
  updateSession(): void {
    if (this.currentSession) {
      this.currentSession.updatedAt = nowIso();
    }
  }

  /**
   * Enables or disables monitoring for the current session. This method updates the `isMonitoringEnabled` flag in the session information and also updates the last updated time to the current time. If no session is active, this method returns null.
   * @param {boolean} enabled - A boolean value indicating whether monitoring should be enabled (true) or disabled (false) for the current session.
   * @returns {LocalSession | null} The updated session information with the new monitoring enabled flag and updated time.
   */
  setMonitoringEnabled(enabled: boolean): LocalSession {
    if (!this.currentSession) {
      this.currentSession = this.startSession();
    } else {
      this.currentSession.isMonitoringEnabled = enabled;
      this.currentSession.updatedAt = nowIso();
    }

    return this.session!;
  }
}

// Export our singleton instance;
export const sessionService = SessionService.getInstance();
export default sessionService;
