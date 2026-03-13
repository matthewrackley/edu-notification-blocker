import { Request, Response } from 'express';
import { configService } from '../services/config.service';
import { wsService } from '../services/ws.service';
import { InstallationWebsiteConfig } from '../types/installation.types';

/**
 * Normalizes incoming partial configuration by falling back to existing values.
 * @param {Partial<InstallationWebsiteConfig>} partial - Incoming partial config payload.
 * @returns {InstallationWebsiteConfig} A full, validated config candidate.
 */
//!: Takes partial config and produces a complete with defaults from current.
const toConfigCandidate = (partial: Partial<InstallationWebsiteConfig>): InstallationWebsiteConfig => {
  const config = configService.config;
  return {
    schoolDomain: typeof partial.schoolDomain === 'string' ? partial.schoolDomain : config.schoolDomain,
    trackBlackboard: typeof partial.trackBlackboard === 'boolean' ? partial.trackBlackboard : config.trackBlackboard,
    trackMicrosoft365: typeof partial.trackMicrosoft365 === 'boolean' ? partial.trackMicrosoft365 : config.trackMicrosoft365,
    trackGoogleWorkspace: typeof partial.trackGoogleWorkspace === 'boolean' ? partial.trackGoogleWorkspace : config.trackGoogleWorkspace
  };
};

/**
 * Reads a checkbox-style field from form data into a boolean value.
 * @param {unknown} value - Raw form field value.
 * @returns {boolean} True when the checkbox-like value indicates enabled.
 */
//!: Converts form checkbox values (which can be 'on', 'true', or boolean true) into a consistent boolean.
const toCheckboxBool = (value: unknown): boolean => (value === 'on' || value === 'true' || value === true ? true : false);

/**
 * Renders a lightweight HTML editor for the installation configuration.
 * @param {InstallationWebsiteConfig} config - Current installation configuration.
 * @param {boolean} saved - Whether to display a saved status message.
 * @returns {string} HTML markup for the editor view.
 */
const renderConfigEditor = (config: InstallationWebsiteConfig, saved: boolean): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Edu Notification Blocker - Config</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 24px; max-width: 640px; }
      h1 { margin: 0 0 16px; }
      form { display: grid; gap: 12px; }
      label { display: grid; gap: 6px; font-weight: 600; }
      input[type="text"] { padding: 8px 10px; font-size: 14px; }
      .row { display: flex; align-items: center; gap: 8px; font-weight: 500; }
      button { padding: 10px 14px; font-size: 14px; cursor: pointer; }
      .status { color: #0a7f2e; font-weight: 600; opacity: 1; transition: opacity 0.4s ease; }
      .status.fade-out { opacity: 0; }
      .muted { color: #5f6368; font-size: 13px; }
    </style>
  </head>
  <body>
    <h1>System App Configuration</h1>
    ${saved ? '<p id="save-status" class="status">Saved successfully.</p>' : ''}
    <p class="muted">This editor is exposed locally at 127.0.0.1 only.</p>
    <form method="post" action="/config/edit">
      <label>
        School Domain
        <input type="text" name="schoolDomain" value="${config.schoolDomain}" required />
      </label>
      <label class="row">
        <input type="checkbox" name="trackBlackboard" ${config.trackBlackboard ? 'checked' : ''} />
        Track Blackboard
      </label>
      <label class="row">
        <input type="checkbox" name="trackMicrosoft365" ${config.trackMicrosoft365 ? 'checked' : ''} />
        Track Microsoft 365
      </label>
      <label class="row">
        <input type="checkbox" name="trackGoogleWorkspace" ${config.trackGoogleWorkspace ? 'checked' : ''} />
        Track Google Workspace
      </label>
      <button type="submit">Save Configuration</button>
    </form>
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        const status = document.getElementById('save-status');
        if (status) {
          setTimeout(() => {
            status.classList.add('fade-out');
            setTimeout(() => status.remove(), 400);
          }, 6000);
        }
      });
    </script>
  </body>
</html>`;

// Here we get the current configuration saved in memory
export const getInstallationConfig = (_req: Request, res: Response) => {
  return res.status(200).json({
    ok: true,
    config: configService.config
  });
};

// Here we update the installation configuration in memory
export const updateInstallationConfig = async (
  req: Request<unknown, unknown, Partial<InstallationWebsiteConfig>>,
  res: Response
) => {

  // Generate config from request body
  const newConfig = toConfigCandidate(req.body);
  if (!newConfig || typeof newConfig !== 'object') {

    // Handle cases where newConfig does not handle
    return res.status(400).json({
      ok: false,
      error: 'Invalid configuration payload'
    });
  }

  try {

    // Update the config and write it to $HOME/.config/...
    const updatedConfig = configService.updateConfig(newConfig);
    configService.saveToFile();

    // Broadcast 'UPDATE' event to websocket
    wsService.broadcast({
      type: 'UPDATE',
      data: {
        config: updatedConfig
      }
    });

    // return ok result and config
    return res.status(200).json({
      ok: true,
      config: updatedConfig
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Serves a local HTML configuration editor page.
 * @param {Request} req - Express request.
 * @param {Response} res - Express response.
 * @returns HTML response with current configuration.
 */
export const getInstallationConfigEditor = (req: Request, res: Response) => {
  const saved = req.query.saved === '1';
  return res.status(200).send(renderConfigEditor(configService.config, saved));
};

/**
 * Handles configuration updates submitted from the local HTML editor.
 * @param {Request<unknown, unknown, Record<string, unknown>>} req - Express request.
 * @param {Response} res - Express response.
 * @returns {Response} Redirect back to editor with save state.
 */
export const updateInstallationConfigFromForm = (
  req: Request<unknown, unknown, Record<string, unknown>>,
  res: Response
) => {
  try {

    // Normalize incoming form data into a full config object
    const nextConfig = toConfigCandidate({
      schoolDomain: typeof req.body.schoolDomain === 'string' ? req.body.schoolDomain : undefined,
      trackBlackboard: toCheckboxBool(req.body.trackBlackboard),
      trackMicrosoft365: toCheckboxBool(req.body.trackMicrosoft365),
      trackGoogleWorkspace: toCheckboxBool(req.body.trackGoogleWorkspace)
    });

    // Update in-memory config and save to file
    configService.updateConfig(nextConfig);
    const savedConfig = configService.saveToFile();

    // Broadcast 'UPDATE' event to all websocket clients with the new config
    wsService.broadcast({
      type: 'UPDATE',
      data: {
        config: savedConfig
      }
    });
    // Redirect back to the editor with a query param indicating a successful save
    return res.redirect(302, '/config/edit?saved=1');
  } catch (error) {
    return res.status(400).send(error instanceof Error ? error.message : 'Invalid configuration payload');
  }
};
