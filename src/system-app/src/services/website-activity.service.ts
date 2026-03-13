// Import types
import {
  ActiveWebsiteEntry,
  WebsiteActivityState,
  WebsiteEventPayload,
  WebsiteStateResponse
} from '../types/website.types';

// Import utilities
import { nowIso } from '../utils/time';
import { normalizeDomain } from '../utils/normalize-url';
import { reactionService } from './reaction.service';

type ReactionService = Awaited<typeof reactionService>;

async function handleActiveEvents(this: WebsiteActivityService, event: WebsiteEventPayload, reactionService: ReactionService) {
  if (typeof event.tabId !== "number" || !event.hostname || !event.url) {
    return await this.getState();
  }
  // Generate a unique key for the active entry based on the tab ID and window ID
  const key = this.makeKey(event);
  const hostname = normalizeDomain(event.hostname)!;
  const existing = this.activeEntries.get(key);
  if (existing) {
    // If an entry exists, update it with the new hostname, URL, and last seen time.
    this.activeEntries.set(key, {
      ...existing,
      hostname,
      url: event.url!,
      lastSeenAt: nowIso()
    });
  } else {
    // If it does not exist, create a new entry with the provided information and the current timestamp for both enteredAt and lastSeenAt.
    this.activeEntries.set(key, {
      hostname,
      url: event.url,
      tabId: event.tabId,
      windowId: event.windowId,
      enteredAt: nowIso(),
      lastSeenAt: nowIso()
    });
  }
  return await this.getState();
}

async function handleUpdateEvent(this: WebsiteActivityService, event: WebsiteEventPayload, reactionService: ReactionService) {
  if (typeof event.tabId !== "number") {
    return await this.getState();
  }
  const key = this.makeKey(event);

  if (!event.hostname || !event.url) {
    this.activeEntries.delete(key);
    return await this.getState();
  }

  const hostname = normalizeDomain(event.hostname);
  const existing = this.activeEntries.get(key);

  if (existing) {
    this.activeEntries.set(key, {
      ...existing,
      hostname,
      url: event.url,
      lastSeenAt: nowIso()
    });
  } else {
    this.activeEntries.set(key, {
      hostname,
      url: event.url,
      tabId: event.tabId,
      windowId: event.windowId,
      enteredAt: nowIso(),
      lastSeenAt: nowIso()
    });
  }
  return await this.getState();
}

/**
 * Service for tracking website activity across browser tabs and windows. This service maintains an in-memory map of active website entries, keyed by a combination of tab ID and window ID. It provides methods to handle website events (enter, leave, update, close, heartbeat) and to retrieve the current state of active websites.
 * @class WebsiteActivityService - The WebsiteActivityService class provides methods to track and manage website activity across browser tabs and windows.
 * @method handleEvent(event: WebsiteEventPayload) - Handles a website event by updating the active entries based on the event type (enter, leave, update, close, heartbeat) and returns the updated state of active websites.
 * @method getState() - Returns the current state of active websites, including the list of active entries, count of active entries, list of unique active hostnames, and a boolean indicating whether the user is currently inside a monitored website.
 * @method clear() - Clears all active entries from the service.
 */
class WebsiteActivityService {
  // In the following few lines we create a singleton service so that way only one instance of the WebsiteActivityService class exists throughout the applications lifecycle.
  private static instance: WebsiteActivityService;
  private constructor() { }
  static getInstance(): WebsiteActivityService {
    if (!WebsiteActivityService.instance) {
      WebsiteActivityService.instance = new WebsiteActivityService();
    }
    return WebsiteActivityService.instance;
  }
  /**
   * A map of active website entries, keyed by a combination of tab ID and window ID. Each entry contains information about the hostname, URL, tab ID, window ID, time entered, and last seen time for a website that is currently active in a browser tab.
   * @property {Map<string, ActiveWebsiteEntry>} activeEntries - The map of active website entries.
   */
  activeEntries = new Map<string, ActiveWebsiteEntry>();

  public get activityState(): WebsiteActivityState {
    return this.activeEntries.size > 0 ? "ACTIVE" : "INACTIVE";
  };
  /**
   * Generates a unique key for a given tab ID and window ID by concatenating them with a colon. This key is used to store and retrieve active website entries in the activeEntries map.
   * @method makeKey
   * @param {WebsiteEventPayload} event - The payload of the website event, containing the type of event, hostname, URL, tab ID, window ID, and an optional timestamp.
   * @returns {string} A unique key in the format "windowId:tabId".
   */
  makeKey(event: WebsiteEventPayload): string {
    return `${event.windowId}:${event.tabId!}`;
  }

  private handleActiveEvents = handleActiveEvents.bind(this);
  private handleUpdateEvent = handleUpdateEvent.bind(this);

  /**
   * Handles a website event by updating the active entries based on the event type (enter, leave, update, close, heartbeat) and returns the updated state of active websites. For 'ENTER', 'UPDATE', and 'HEARTBEAT' events, it updates or adds an entry in the activeEntries map. For 'LEAVE' and 'CLOSE' events, it removes the corresponding entry from the map. After processing the event, it returns the current state of active websites.
   * @method handleEvent
   * @param {WebsiteEventPayload} event - The payload of the website event, containing the type of event, hostname, URL, tab ID, window ID, and an optional timestamp.
   * @returns {WebsiteStateResponse} The updated state of active websites after handling the event.
   */
  async handleEvent(event: WebsiteEventPayload): Promise<WebsiteStateResponse> {
    const reactionServiceInstance = await reactionService;
    // Update the active entries based on the event type
    switch (event.type) {
      // For 'ENTER', and 'HEARTBEAT' events:
      case 'ENTER':
      case 'HEARTBEAT': {
        return await this.handleActiveEvents(event, reactionServiceInstance);
      }
      case 'UPDATE': {
        return await this.handleUpdateEvent(event, reactionServiceInstance);
      }
      case 'LEAVE': {
        if (typeof event.tabId !== "number") {
          return await this.getState();
        }
        const key = this.makeKey(event);
        this.activeEntries.delete(key);
        return await this.getState();
      }
      case 'CLOSE': {
        for (const [key, entry] of this.activeEntries.entries()) {
          if (entry.windowId === event.windowId) {
            this.activeEntries.delete(key);
          }
        }
        return await this.getState();
      }
      default:
        return await this.getState();
    }
  }

  /**
   * Returns the current state of active websites, including the list of active entries, count of active entries, list of unique active hostnames, and a boolean indicating whether the user is currently inside a monitored website. The active entries are retrieved from the activeEntries map, and the unique hostnames are extracted from these entries. The isInsideMonitoredWebsite property is determined based on whether there are any active entries.
   * @method getState
   * @returns {WebsiteStateResponse} The current state of active websites, including the list of active entries, count of active entries, list of unique active hostnames, and a boolean indicating whether the user is currently inside a monitored website.
   */
  async getState(): Promise<WebsiteStateResponse> {
    const reactionServiceInstance = await reactionService;
    await reactionServiceInstance.handleActivity(this.activeEntries.size);
    return {
      activeEntries: [...this.activeEntries.values()],
      activeCount: this.activeEntries.size,
      activeHostnames: [...new Set(Array.from(this.activeEntries.values(), (en) => en.hostname))],
      isInsideMonitoredWebsite: this.activeEntries.size > 0
    };
  }

  /**
   * Clears all active entries from the service by emptying the activeEntries map. After clearing the entries, it returns the updated state of active websites, which will indicate that there are no active entries and that the user is not inside any monitored website.
   * @method clear
   * @returns {WebsiteStateResponse} The updated state of active websites after clearing all entries, indicating that there are no active entries and that the user is not inside any monitored website.
   */
  async clear(): Promise<WebsiteStateResponse> {
    this.activeEntries.clear();
    return await this.getState();
  }
}

// Export our singleton instance;
export const websiteActivityService = WebsiteActivityService.getInstance();
