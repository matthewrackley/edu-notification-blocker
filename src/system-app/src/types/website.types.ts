/**
 * Events that can be emitted by the WebsiteActivityService to indicate changes in website activity. These events include:
 * - 'ENTER': Indicates that the user has a monitored website open in a tab.
 * - 'LEAVE': Indicates that the user has closed a monitored website tab.
 * - 'UPDATE': Indicates that there has been an update to a tab: e.g., changed URL and may need to switch tracked website state.
 * - 'CLOSE': Indicates that a browser window associated with an active website tab has been closed.
 * - 'HEARTBEAT': Indicates a periodic update to keep the active website entry fresh, even if there are no changes in URL or hostname.
 * These events are used by the WebsiteActivityService to manage the state of active websites and to notify other parts of the application about changes in website activity.
 * @type {WebsiteEventType}
 */
export type WebsiteEventType =
  | 'ENTER'
  | 'LEAVE'
  | 'UPDATE'
  | 'CLOSE'
  | 'HEARTBEAT';

/**
 * @interface WebsiteEventPayload
 * @description Represents the payload for a website event, containing information about the event type, hostname, URL, and browser context.
 * @property {WebsiteEventType} type - The type of website event (e.g., 'ENTER', 'LEAVE', 'UPDATE', 'CLOSE', 'HEARTBEAT').
 * @property {string} hostname - The hostname of the website associated with the event.
 * @property {string} url - The full URL of the website associated with the event.
 * @property {number} tabId - The ID of the browser tab where the event occurred.
 * @property {number} windowId - The ID of the browser window where the event occurred.
 * @property {number} [timestamp] - An optional timestamp indicating when the event occurred, represented as milliseconds since the Unix epoch.
 * This interface is used to encapsulate all relevant information about a website event, allowing the WebsiteActivityService to process and track website activity effectively.
 */
export interface WebsiteEventPayload {
  type: WebsiteEventType;
  hostname?: string;
  url?: string;
  tabId?: number;
  windowId: number;
  timestamp?: number;
}

/**
 * @interface ActiveWebsiteEntry
 * @description Represents an active website entry, containing information about the website's hostname, URL, browser context, and timestamps for when the user entered and last interacted with the website.
 * @property {string} hostname - The normalized hostname of the active website.
 * @property {string} url - The full URL of the active website.
 * @property {number} tabId - The ID of the browser tab where the website is active.
 * @property {number} windowId - The ID of the browser window where the website is active.
 * @property {string} enteredAt - The ISO timestamp indicating when the user entered the website.
 * @property {string} lastSeenAt - The ISO timestamp indicating the last time the user interacted with or was seen on the website.
 * This interface is used to represent each active website entry in the WebsiteActivityService, allowing it to track and manage active websites effectively.
 * The enteredAt and lastSeenAt properties are particularly important for determining how long a user has been active on a website and for identifying when they last interacted with it.
 */
export interface ActiveWebsiteEntry {
  hostname: string;
  url: string;
  tabId: number;
  windowId: number;
  enteredAt: string;
  lastSeenAt: string;
}

/**
 * @interface WebsiteStateResponse
 * @description Represents the response structure for the current state of active websites, including a list of active entries, count of active entries, list of unique active hostnames, and a boolean indicating whether the user is currently inside a monitored website.
 * @property {ActiveWebsiteEntry[]} activeEntries - An array of active website entries, each containing information about the hostname, URL, browser context, and timestamps for when the user entered and last interacted with the website.
 * @property {number} activeCount - The total count of active website entries currently being tracked.
 * @property {string[]} activeHostnames - An array of unique hostnames for the active websites currently being tracked.
 * @property {boolean} isInsideMonitoredWebsite - A boolean indicating whether the user is currently inside any monitored website (i.e., if there is at least one active entry).
 * This interface is used as the return type for methods in the WebsiteActivityService that provide information about the current state of active websites, allowing other parts of the application to easily access and utilize this information for various purposes (e.g., displaying active websites, making decisions based on website activity).
 */
export interface WebsiteStateResponse {
  activeEntries: ActiveWebsiteEntry[];
  activeCount: number;
  activeHostnames: string[];
  isInsideMonitoredWebsite: boolean;
}

/**
 * @interface WatchedWebsiteRule
 * @description Represents a rule for monitoring specific websites, including the rule's ID, label, list of hostnames to monitor, whether to match subdomains, and whether the rule is enabled.
 * @property {string} id - A unique identifier for the watched website rule.
 * @property {string} label - A human-readable label for the rule, used for display purposes.
 * @property {string[]} hostnames - An array of hostnames that this rule monitors. If matchSubdomains is true, any subdomain of these hostnames will also be monitored.
 * @property {boolean} matchSubdomains - A boolean indicating whether to monitor subdomains of the specified hostnames. If true, any subdomain of the hostnames in the list will also be monitored.
 * @property {boolean} enabled - A boolean indicating whether this rule is currently enabled. Only enabled rules will be considered when determining if a website should be monitored.
 */
export interface WatchedWebsiteRule {
  id: string;
  label: string;
  hostnames: string[];
  matchSubdomains: boolean;
  enabled: boolean;
}

export type WebsiteActivityState = "ACTIVE" | "INACTIVE";
