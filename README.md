# Education Notification Blocker

|<center>Property</center>|<center>Value</center>|
|-|-|
|<center>**ID**</center>|<center>`edu-notification-blocker`</center>|

## Summary

Website-monitoring application that handles system notification blocking for study sessions while user is on a Linux OS.

This program is split into a `Chrome extension` and a `system app/server`:

- The extension:
  - Watches browser activity.
  - Reports matching website events to the system app.

- The system app:
  - Owns the installation config.
  - Tracks active study-session state.
  - Exposes a small local config editor. andH;
  - Runs an Electron tray process.

## Project Layout

- `src/chrome-extension/`: Manifest V3 extension source.
- `src/chrome-extension/dist/`: built extension assets (generated, not committed).
- `src/system-app/`: Express server, Electron integration, websocket server, and config/session/website logic.
- `src/system-app/dist/`: built system app bundle (generated, not committed).

## Runtime Flow

1. The extension background worker monitors tabs and windows.
2. It checks whether the local system app is reachable at `http://127.0.0.1:42424`.
3. It starts or updates local session state through the system app HTTP API.
4. It posts watched website events to the system app.
5. The system app evaluates events against the current config and broadcasts updates to connected extension clients over websocket.
6. The system app also launches an Electron tray entry point for local desktop control.

## Watched Website Categories

- Configured school domain and its subdomains
- Blackboard
- Microsoft 365
- Google Workspace Docs

The matching rules live in the system app and are driven by the local installation config.

## Initial Setup

1. From the repository root, run this command to install dependencies for both subprojects:

```bash
npm run get:dependencies
```

2. Then again from the repository root, run this command to build the full project:

```bash
npm run build
```

3. Next we will install the extension locally in Chrome. Follow the instructions in the next section.

## Install The Extension

To install the extension locally in Chrome:

1. Open `chrome://extensions` in chrome in order to manage extensions.
2. Enable `Developer mode` using the toggle in the top-right corner of the extensions page.
![Developer Mode](https://imgur.com/a/JXKvv5F "Toggle Developer Mode On")
3. Click `Load unpacked` at the top-left of the page.
![Load Unpacked](https://imgur.com/a/FHEIuJl "Load Unpacked Extension")
4. Select the `src/chrome-extension` folder from this repository.

### Notes

- The extension manifest points to `dist/background.js` inside `src/chrome-extension`, so the build step MUST run before loading the unpacked extension.
- If you change extension source files later, rebuild with `npm run build` in `src/chrome-extension` and then click the reload action for the extension in `chrome://extensions`.
- As soon as you install the extension in Chrome, it will attempt to connect to the system app at `http://127.0.0.1:42424`. If the system app is not running, the extension will keep retrying until it can connect.
- You must currently manually disable it from the extension page if you want to stop it from retrying.

## Run the application

Simply run the following command to start the system app:

```bash
npm run start:system-app
```

## Dependencies

These are the packages currently required to build and run the project.

Root workflow:

- `npm`: used by the root scripts to install dependencies and orchestrate both subprojects

System app runtime dependencies in `src/system-app`:

- `express`: HTTP API and local config editor routes
- `cors`: CORS handling for local HTTP endpoints
- `dotenv`: environment variable loading from `.env`
- `electron`: tray process and desktop config window
- `ws`: websocket server for realtime updates to the extension

System app build dependencies in `src/system-app`:

- `typescript`: TypeScript compilation
- `tsx`: local development runner for `npm run dev`
- `webpack`: bundling for the production output
- `webpack-cli`: webpack command-line runner
- `ts-loader`: webpack TypeScript loader
- `terser-webpack-plugin`: production minification
- `@types/node`
- `@types/express`
- `@types/cors`
- `@types/ws`
- `@types/electron`

Chrome extension build dependencies in `src/chrome-extension`:

- `typescript`: TypeScript compilation
- `webpack`: extension bundling
- `webpack-cli`: webpack command-line runner
- `ts-loader`: webpack TypeScript loader
- `terser-webpack-plugin`: production minification
- `@types/chrome`

## System App Endpoints

The local system app exposes these routes on `127.0.0.1:42424` by default:

- `GET /health`
- `GET /config`
- `POST /config/update`
- `GET /config/edit`
- `POST /config/edit`
- `GET /session`
- `POST /session/start`
- `GET /websites/state`
- `POST /websites/event`
- `WS /ws`

## Local Config

Default user config path on Linux:

```text
~/.config/edu-notification-blocker/config.json
```

The config controls the school domain and which provider categories are enabled.
