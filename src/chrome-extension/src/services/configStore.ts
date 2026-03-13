import { type InstallationConfig } from '../types/events';
import { getSystemConfig } from '../api/systemApp.js';

let currentConfig: InstallationConfig | null = null;

/**
 * Compares two InstallationConfig objects for deep equality.
 * @param {InstallationConfig | null} c1 - First config to compare.
 * @param {InstallationConfig | null} c2 - Second config to compare.
 * @returns {boolean} True if configs are deeply equal, false otherwise.
 */
const areConfigsEqual = (c1: InstallationConfig | null, c2: InstallationConfig | null): boolean => {
  if (!c1 || !c2) return c1 === c2;

  return (
    c1.schoolDomain === c2.schoolDomain &&
    c1.trackBlackboard === c2.trackBlackboard &&
    c1.trackMicrosoft365 === c2.trackMicrosoft365 &&
    c1.trackGoogleWorkspace === c2.trackGoogleWorkspace
  );
};

/**
 * Returns the current loaded config.
 */
export const getConfig = (): InstallationConfig | null => {
  return currentConfig;
};

/**
 * Loads the configuration from the system app and caches it in memory.
 * @returns {Promise<InstallationConfig | null>} The loaded configuration or null if loading failed.
 */
export const loadConfig = async (): Promise<InstallationConfig | null> => {
  currentConfig = await getSystemConfig();
  return currentConfig;
};

/**
 * Refreshes the configuration by reloading it from the system app and comparing it to the currently cached config.
 * @returns {Promise<{ config: InstallationConfig | null; changed: boolean }>} The refreshed config and whether it changed from the previous value.
 */
export const refreshConfig = async (): Promise<{
  config: InstallationConfig | null;
  changed: boolean;
}> => {
  // Load the latest config from the system app
  const nextConfig = await getSystemConfig();
  // Determine if current config is same as latest config.
  const changed = !areConfigsEqual(currentConfig, nextConfig);
  // Update current config to latest config.
  currentConfig = nextConfig;
  return {
    config: currentConfig,
    changed
  };
};

export default {
  getConfig,
  loadConfig,
  refreshConfig
};
