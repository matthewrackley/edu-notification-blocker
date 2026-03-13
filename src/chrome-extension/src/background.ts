import { isSystemAppOnline, postWebsiteEvent, startSystemSession } from './api/systemApp.js';
import { loadConfig, refreshConfig } from './services/configStore.js';
import { getTabSnapshot, removeTabSnapshot, removeWindowSnapshots, setTabSnapshot, toSnapshot } from './services/tabState';


// boolean flag indicating whether the system app is currently reachable
let systemAppRunning = false;
// declare WebSocket and related state variables for managing connection to system app
let ws: WebSocket | null = null;
// number of consecutive reconnect attempts made after losing connection to system app
let wsReconnectAttempts = 0;
// timer ID for scheduled WebSocket reconnect attempt, used to prevent multiple simultaneous reconnect timers
let wsReconnectTimer: number | null = null;

/**
 * WebSocket event payload shape from system-app.
 */
interface SystemAppWsEvent {
  type: 'ONLINE' | 'UPDATE' | 'SESSION_STARTED' | string;
}

/**
 * Allows us to poll if the systemApp is running from various parts.
 * @returns {boolean} Whether the system app is currently reachable.
 */
const shouldRun = (on?: boolean): boolean => {
  if (typeof on === 'boolean') {
    systemAppRunning = on;
  }
  return systemAppRunning;
};

/**
 * Directly update our flag, and ask server if it's online or not.
 * Updates extension runtime state by probing system app health.
 * @returns {Promise<boolean>} Latest online status of the system app.
 */
const syncSystemAppStatus = async (): Promise<boolean> => {
  systemAppRunning = await isSystemAppOnline();
  return systemAppRunning;
};

/**
 * Refreshes config from system app and reprocesses all tabs if there are changes.
 * @returns {Promise<void>} Resolves after config is refreshed and tabs are reprocessed if needed.
 */
const refreshSystemConfig = async (): Promise<void> => {
  // If system app is not currently reachable, use our reconnection timer and skip refresh for now
  if (!(await syncSystemAppStatus())) {
    await connectSystemAppWebSocket();
    return;
  }

  // If connected, fetch the latest config from the system app. Also returns whether config has changed or not
  const { config, changed } = await refreshConfig();

  // If no config was returned, log an error and skip reprocessing tabs since we don't know what the new config is
  if (!config) {
    console.error('Extension could not refresh config from system app');
    return;
  }

  // If config has changed, we need to reprocess all tabs to determine if any watched sites were added or removed
  if (changed) {
    await reprocessAllTabs();
  }
};


/**
 * Schedules reconnect with exponential backoff.
 * @returns {void}
 */
const scheduleWsReconnect = (): void => {
  if (wsReconnectTimer !== null) return;
  // this Math.min() equation was calculated by AI:
  // Starting with the lowest delay of 1 second, for each attempt to reconnect, the delay doubles until it reaches a maximum of 30 seconds.
  const delayMs = Math.min(30_000, 1_000 * 2 ** wsReconnectAttempts);
  wsReconnectTimer = setTimeout(() => {
    // Clear the timer ID to allow future reconnect attempts to be scheduled
    wsReconnectTimer = null;
    // Increment the reconnect attempts counter to increase the delay for the next attempt if this one fails
    wsReconnectAttempts += 1;
    // Attempt to reconnect to the system app WebSocket server
    void connectSystemAppWebSocket();

  }, delayMs) as unknown as number;
};

/**
 * Handles incoming WS events from system-app.
 * @param {MessageEvent<string>} event - Raw websocket message event.
 * @returns {Promise<void>} Resolves after processing message.
 */
const handleWSMessage = async (event: MessageEvent<string>): Promise<void> => {
  try {
    const payload = JSON.parse(event.data) as SystemAppWsEvent;
    switch (payload.type) {
      case 'ONLINE':
        shouldRun(true);
        await refreshSystemConfig();
        break;
      case 'UPDATE':
        shouldRun(true);
        const { changed } = await refreshConfig();
        changed ? await reprocessAllTabs() : undefined;
        break;
      case 'SESSION_STARTED':
        shouldRun(true);
        break;
      default:
        console.warn('Received unknown event type from system app:', payload.type);
        break;
    }
  } catch (error) {
    console.error('Invalid websocket message from system app:', error);
  }
};

/**
 * Connects extension background service worker to system-app websocket server.
 */
const connectSystemAppWebSocket = async () => {
  // If we already have a websocket connection that is open or in the process of connecting, do nothing
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  // If system app is not currently reachable, use our reconnection timer
  if (!(await syncSystemAppStatus())) {
    scheduleWsReconnect();
    return;
  }

  // Create a new WebSocket connection to the system app's websocket server
  ws = new WebSocket('ws://127.0.0.1:42424/ws');

  // When websocket connection experiences an `OPEN` event
  ws.addEventListener('open', () => {
    // On successful connection, reset reconnect attempts counter and update system app status
    wsReconnectAttempts = 0;
    shouldRun(true);
    try {
      // We should validate our current config
      void refreshSystemConfig();
    } catch (err) {
      console.error('Failed to refresh config after websocket open:', err);
    };
  });

  // When websocket connection receives a `MESSAGE` event
  ws.addEventListener('message', (event) => {
    // handle the message
    void handleWSMessage(event as MessageEvent<string>);
  });

  // When the websocket connection experiences an `ERROR` event, set app to offline
  ws.addEventListener('error', () => {
    shouldRun(false);
  });

  // When the websocket connection experiences a `CLOSE` event
  ws.addEventListener('close', () => {
    // Set app to offline, clear the websocket, and schedule a reconnect attempt
    shouldRun(false);
    ws = null;
    scheduleWsReconnect();
  });
};


/**
 * Processes a browser tab by comparing its current state to the previous snapshot and sending appropriate events to the system app based on changes in URL and watched site status.
 * Handles the following scenarios:
 * - If the tab has navigated to a new URL that matches a watched site, sends an 'ENTER' event.
 * - If the tab has navigated away from a watched site, sends a 'LEAVE' event.
 * - If the tab has updated its URL but still matches a watched site, sends an 'UPDATE' event.
 * - If the tab's URL is invalid or cannot be processed, treats it as if it has left any previously matched watched site.
 * @param {number} tabId - The ID of the browser tab to be processed.
 * @param {chrome.tabs.Tab} tab - The current state of the browser tab, including its URL and window ID.
 * @returns {Promise<void>} Resolves after processing is complete and any necessary events have been sent to the system app.
 */
const processTab = async (tabId: number, tab: chrome.tabs.Tab): Promise<void> => {
  // If our local flag says "offline", probe health once so tab events are not dropped due to stale websocket state.
  if (!shouldRun() && !(await syncSystemAppStatus())) return;
  if (typeof tab.windowId !== 'number' || !tab.url) return;

  // See if this tabId is already in a previous snapshot.
  const previous = getTabSnapshot(tabId);

  // Convert the current tab state into a snapshot
  const next = toSnapshot(tabId, tab.windowId, tab.url);

  // If we can't parse URL and create a snapshot
  if (!next) {
    // And the previous snapshot was a watched site
    if (previous?.isWatched) {
      // Then we should send a LEAVE event since we can no longer consider the tab to be on a watched site
      await postWebsiteEvent({
        type: 'LEAVE',
        tabId: previous.tabId,
        windowId: previous.windowId
      });
    }
    // Whether it matches or not, we can not parse this URL and we are no longer in the previous site.
    // We should remove the snapshot from the Map
    removeTabSnapshot(tabId);
    return;
  }

  // If we have a valid snapshot, we should update our Map with the new snapshot for future comparisons
  setTabSnapshot(next);

  // If there was no previous snapshot
  if (!previous) {
    // But the new snapshot matches a watched site
    if (next.isWatched) {
      // Then we should send an ENTER event since we are now on a watched site
      await postWebsiteEvent({
        type: 'ENTER',
        hostname: next.hostname,
        url: next.url,
        tabId: next.tabId,
        windowId: next.windowId
      });
    }
    return;
  }

  // If the previous snapshot was not a watched site but the new snapshot is a watched site
  if (!previous.isWatched && next.isWatched) {
    // Then we should send an ENTER event since we have navigated onto a watched site
    await postWebsiteEvent({
      type: 'ENTER',
      hostname: next.hostname,
      url: next.url,
      tabId: next.tabId,
      windowId: next.windowId
    });
    return;
  }

  // If the previous snapshot was a watched site but the new snapshot is not a watched site
  if (previous.isWatched && !next.isWatched) {
    // Then we should send a LEAVE event since we have navigated away from a watched site
    await postWebsiteEvent({
      type: 'LEAVE',
      tabId: previous.tabId,
      windowId: previous.windowId
    });
    return;
  }

  // If the previous snapshot was a watched site and the new snapshot is also a watched site, but the URL has changed
  if (previous.isWatched && next.isWatched && previous.url !== next.url) {
    // Then we should send an UPDATE event since we have navigated to a different page on the same watched site
    await postWebsiteEvent({
      type: 'UPDATE',
      hostname: next.hostname,
      url: next.url,
      tabId: next.tabId,
      windowId: next.windowId
    });
  }
};

/**
 * Reprocesses all browser tabs by querying the current state of all tabs and running the processTab function on each one to ensure that our tracking state is up to date with the actual state of the browser, especially after changes in configuration or when the extension is first loaded.
 * @returns {Promise<void>} Resolves after all tabs have been processed.
 */
const reprocessAllTabs = async (): Promise<void> => {

  // system app should currently be reachable
  if (!shouldRun()) return;

  // Query the browser for all tabs across all windows
  const tabs = await chrome.tabs.query({});

  // Iterate over each tab and process them all.
  for (const tab of tabs) {
    console.log(tab.id, tab.url);
    if (typeof tab.id === 'number') {
      await processTab(tab.id, tab);
    }
  }
};

/**
 * Bootstraps the extension by establishing a websocket connection to the system app, processing all the tabs, then starting the session.
 */
const bootstrap = async (): Promise<void> => {
  await connectSystemAppWebSocket();
  await chrome.alarms.create('refresh-system-config', {
    periodInMinutes: 5
  });

  if (!(await syncSystemAppStatus())) {
    console.warn('System app is offline. Extension tracking is paused.');
    return;
  }

  const config = await loadConfig();

  if (!config) {
    console.error('Extension could not load config from system app');
    return;
  }

  await startSystemSession();
  await reprocessAllTabs();
};
/**
 * DISCLAIMER: AI GENERATED
 * I am not familiar with chrome extensions API, so the following is done to speed up development.
 */
// Listen for when the extension is installed/updated, bootstrap the system
chrome.runtime.onInstalled.addListener(async () => {
  await bootstrap();
});

// Listen for when the extension starts up, bootstrap the system
chrome.runtime.onStartup.addListener(async () => {
  await bootstrap();
});

// Listen for when the extension heartbeat, refresh system config
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refresh-system-config') {
    await refreshSystemConfig();
  }
});

// Listen for tab updates, if url or loading status changes, process the tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    await processTab(tabId, tab);
  }
});

// Listen for tab removals, if the removed tab was previously on a watched site, send a LEAVE event
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (!shouldRun() && !(await syncSystemAppStatus())) return;
  const previous = removeTabSnapshot(tabId);

  if (previous?.isWatched) {
    await postWebsiteEvent({
      type: 'LEAVE',
      tabId: previous.tabId,
      windowId: previous.windowId
    });
  }
});

// Listen for window removals, if any of the removed tabs were previously on a watched site, send a LEAVE event for each
chrome.windows.onRemoved.addListener(async (windowId) => {
  if (!shouldRun() && !(await syncSystemAppStatus())) return;
  const removed = removeWindowSnapshots(windowId);
  const hadWatchedTabs = removed.some((entry) => entry.isWatched);

  if (hadWatchedTabs) {
    await postWebsiteEvent({
      type: 'CLOSE',
      windowId
    });
  }
});
