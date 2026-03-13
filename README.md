# edu-notification-blocker

Local-first notification blocking for study sessions.

This project is split into a Chrome extension and a local system app. The extension watches browser activity and reports matching website events to the system app. The system app owns the installation config, tracks active study-session state, exposes a small local config editor, and runs an Electron tray process.

## Project Layout

- `src/chrome-extension/`: Manifest V3 extension source.
- `src/system-app/`: Express server, Electron tray integration, websocket server, and config/session/website logic.
- `dist/`: built output copied from the extension and system app release steps.

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

## Root Scripts

From the repository root:

```bash
npm run get:dependencies
```

Installs root dependencies, then installs dependencies for:

- `src/system-app`
- `src/chrome-extension`

Build the full project:

```bash
npm run build
```

This produces:

- `dist/chrome-extension/`
- `dist/system-app/`

Run the built system app:

```bash
npm run start
```

## Development

System app development:

```bash
cd src/system-app
npm run dev
```

System app production build:

```bash
cd src/system-app
npm run build
```

Chrome extension build:

```bash
cd src/chrome-extension
npm run build
```

## Install The Extension

To install the extension locally in Chrome or Chromium:

1. Build the extension assets:

```bash
cd src/chrome-extension
npm install
npm run build
```

1. Open `chrome://extensions` in your browser.
1. Enable `Developer mode` using the toggle in the extensions page.
1. Click `Load unpacked`.
1. Select the `src/chrome-extension` folder from this repository.

The extension manifest points to `dist/background.js`, so the build step must run before loading the unpacked extension.

If you change extension source files later, rebuild with `npm run build` in `src/chrome-extension` and then click the reload action for the extension in `chrome://extensions`.

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
