/**
 * Utility functions for normalizing URLs.
 * This module provides functions to normalize URLs by trimming whitespace and converting to lowercase.
 * Normalizing URLs helps ensure consistency when comparing or storing URLs, as it eliminates variations caused by case sensitivity and extra spaces.
 * @constant { (hostname: string) => string } normalizeHostname - Normalizes a hostname by trimming whitespace and converting to lowercase.
 */
export const normalizeDomain = (hostname: string): string => {
  const value = hostname.trim().toLowerCase();

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
