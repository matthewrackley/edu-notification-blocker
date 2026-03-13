/**
 * Utility functions related to time.
 * This module provides functions for working with time, such as getting the current time in ISO format.
 * ISO Format is a standardized way to represent date and time, which is widely used in programming and data exchange.
 * @constant {() => string} nowIso - Returns the current time in ISO format.
 */
export const nowIso = (): string => new Date().toISOString();
