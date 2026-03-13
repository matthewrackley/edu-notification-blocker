import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration for the application, loaded from environment variables.
 * This module exports an `env` object containing the configuration values for the application.
 * The configuration values are loaded from environment variables, with default values provided where necessary.
 * This allows for easy configuration of the application without hardcoding values in the source code.
 * @constant {Object} env - The configuration object containing the application settings.
 * @property {number} port - The port number on which the server will listen (default: 42424).
 * @property {string} allowedOrigin - The allowed origin for CORS (default: '*').
 */
export const env = {
  port: Number(process.env.PORT || 42424),
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  installConfigFile: process.env.INSTALL_CONFIG_PATH || `${ process.env.HOME }/.config/edu-notification-blocker/config.json`,
  installConfig: process.env.INSTALL_CONFIG_DIR || `${ process.env.HOME }/.config/edu-notification-blocker`,
  contextBridgeAPIKey: process.env.CONTEXT_BRIDGE_API_KEY || "education-notification-blocker-api-key"
};
