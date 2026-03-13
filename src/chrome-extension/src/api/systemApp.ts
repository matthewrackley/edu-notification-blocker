import { type InstallationConfig, type WebsiteEventPayload } from '../types/events';

interface ConfigResponse {
  ok: boolean;
  config: InstallationConfig;
}

/**
 * Checks if the system app is online by probing its health endpoint.
 * @returns {Promise<boolean>} True when the health endpoint responds with an ok status.
 */
export const isSystemAppOnline = async (): Promise<boolean> => {
  try {
    const response = await fetch(`http://127.0.0.1:42424/health`);
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Starts a tracking session in the system app.
 * @returns {Promise<boolean>} True when the session start endpoint responds with an ok status.
 */
export const startSystemSession = async (): Promise<boolean> => {
  try {
    const response = await fetch(`http://127.0.0.1:42424/session/start`, {
      method: 'POST'
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to start session in system app:', error);
    return false;
  }
};

export const getSystemConfig = async (): Promise<InstallationConfig | null> => {
  try {
    const url = `http://127.0.0.1:42424/config`;
    const response = await fetch(url);
    const data = (await response.json()) as ConfigResponse;

    return data.ok ? data.config : null;
  } catch (error) {
    console.error('Failed to load config from system app:', error);
    return null;
  }
};

export const postWebsiteEvent = async (payload: WebsiteEventPayload): Promise<void> => {
  try {
    await fetch(`http://127.0.0.1:42424/websites/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        timestamp: payload.timestamp ?? Date.now()
      })
    });
  } catch (error) {
    console.error('Failed to send website event to system app:', error);
  }
};

export default {
  isSystemAppOnline,
  startSystemSession,
  getSystemConfig,
  postWebsiteEvent
};
