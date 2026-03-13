import { TrackedTabSnapshot } from '../types/events';
import { InstallationConfig, MatchResult } from '../types/events.js';
import { getConfig } from './configStore.js';

const tabSnapshots = new Map<number, TrackedTabSnapshot>();

/**
 * Normalizes a domain by extracting the hostname.
 */
const normalizeDomain = (domain: string): string => {
  const value = domain.trim().toLowerCase();

  try {
    const withProtocol =
      value.startsWith('http://') || value.startsWith('https://')
        ? value
        : `https://${value}`;

    return new URL(withProtocol).hostname;
  } catch {
    return value.replace(/^www\./, '');
  }
};

const matchesExactOrSubdomain = (hostname: string, target: string): boolean => {
  const h = normalizeDomain(hostname);
  const t = normalizeDomain(target);

  return h === t || h.endsWith(`.${t}`);
};

const matchesAny = (domain: string, ...domains: string[]): boolean => {
  return domains.some((domain) => matchesExactOrSubdomain(domain, domain));
};

const getActiveConfig = (): InstallationConfig | null => {
  return getConfig();
};

/**
 * Determines if a given domain is watched or not, and by which provider if it is watched.
 */
export const getMatch = (domain: string): MatchResult => {
  const config = getActiveConfig();
  const hostname = normalizeDomain(domain);

  if (!config || !hostname) {
    return {
      isWatched: false,
      provider: null
    };
  }

  if (
    config.schoolDomain &&
    matchesExactOrSubdomain(hostname, config.schoolDomain)
  ) {
    return {
      isWatched: true,
      provider: 'SCHOOL'
    };
  }

  if (
    config.trackBlackboard &&
    matchesAny(hostname, 'blackboard.com', 'blackboardcdn.com')
  ) {
    return {
      isWatched: true,
      provider: 'BLACKBOARD'
    };
  }

  if (
    config.trackMicrosoft365 &&
    matchesExactOrSubdomain(hostname, 'm365.cloud.microsoft.com')
  ) {
    return {
      isWatched: true,
      provider: 'MICROSOFT_365'
    };
  }

  if (
    config.trackGoogleWorkspace &&

    matchesExactOrSubdomain(hostname, 'docs.google.com')
  ) {
    return {
      isWatched: true,
      provider: 'GOOGLE_WORKSPACE'
    };
  }

  return { isWatched: false, provider: null };
};

export const getTabSnapshot = (
  tabId: number
): TrackedTabSnapshot | undefined => {
  return tabSnapshots.get(tabId);
};

export const setTabSnapshot = (snapshot: TrackedTabSnapshot): void => {
  tabSnapshots.set(snapshot.tabId, snapshot);
};

export const removeTabSnapshot = (
  tabId: number
): TrackedTabSnapshot | undefined => {
  const existing = tabSnapshots.get(tabId);
  tabSnapshots.delete(tabId);
  return existing;
};

export const removeWindowSnapshots = (
  windowId: number
): TrackedTabSnapshot[] => {
  const removed: TrackedTabSnapshot[] = [];

  for (const [tabId, snapshot] of tabSnapshots.entries()) {
    if (snapshot.windowId === windowId) {
      removed.push(snapshot);
      tabSnapshots.delete(tabId);
    }
  }

  return removed;
};

/**
 * Converts a browser tab into a TrackedTabSnapshot.
 * Normalizes the URL, extracts the hostname, and provides information of if it matches any watched sites
 * If the tab's URL is invalid or cannot be processed, returns null.
 * @param {number} tabId - The ID of the browser tab.
 * @param {number} windowId - The ID of the browser window containing the tab.
 * @param {string} urlString - The URL of the tab to be processed.
 * @returns {TrackedTabSnapshot} A snapshot of the tab's state relevant for tracking, or null if the URL is invalid.
 */
export const toSnapshot = (
  tabId: number,
  windowId: number,
  urlString: string
): TrackedTabSnapshot | null => {
  try {
    // I would have never thought of using a try catch block to handle this. AI Generated
    const parsedUrl = new URL(urlString);
    const hostname = parsedUrl.hostname.toLowerCase();
    const match = getMatch(hostname);

    return {
      tabId,
      windowId,
      url: parsedUrl.href,
      hostname,
      ...match
    };
  } catch {
    // This block will be reached if URL parsing fails.
    return null;
  }
};

export default {
  toSnapshot,
  getTabSnapshot,
  setTabSnapshot,
  removeTabSnapshot,
  removeWindowSnapshots
};
