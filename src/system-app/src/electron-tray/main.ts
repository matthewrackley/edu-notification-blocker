import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  type MenuItemConstructorOptions,
  webFrame,
  WebContents,
  Session,
  View,
  WebContentsView
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { configService } from '../services/config.service';
// execFileAsync is a promisified version of execFile. Which should have been async to begin with.


/**
 * Shape of installation config fetched from system-app.
 */
interface InstallationWebsiteConfig {
  schoolDomain: string;
  trackBlackboard: boolean;
  trackMicrosoft365: boolean;
  trackGoogleWorkspace: boolean;
}

/**
 * Shape of config API response.
 */
interface ConfigResponse {
  ok: boolean;
  config: InstallationWebsiteConfig;
}

/**
 * Tray IPC message sent to parent launcher process.
 */
interface TrayIpcMessage {
  type: 'quit';
}

//!: Define our `host:port`
const port = Number(process.env.SYSTEM_APP_PORT || 42424);
const baseUrl = `http://127.0.0.1:${port}`;

//!: Declare tray and electron window objects. Initialize with a null value.
let tray: Tray | null = null;
let electron: BrowserWindow | null = null;

//!: Set paths for tray icon assets.
const assetsDir = path.resolve(configService.configPath, 'assets');
const moduleAssets = path.resolve(__dirname, "../../assets/");

//!: Handle assets by ensuring they exist in the expected location. If not, create/copy them as needed.
type StrObj = { [key: string]: string; };
type AssetPaths = {svg:StrObj[],png:StrObj[]}
function handleAssets() {
  const inputs = ["tray.png", "tray.svg", 'github.svg', 'simpleanalytics.svg', 'googledocs.svg', 'm365.svg', 'm365.png', 'blackboard.svg', 'blackboard.png', 'lamar.png', 'github.png', 'googledocs.png'];
  const paths: AssetPaths = { svg: [], png: [] };

  //!: Iterate through the defined asset inputs and categorize them by file type, while also mapping their source and destination paths.
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    if (input.endsWith('.svg')) {
      paths.svg.push({ [path.resolve(moduleAssets, input)]: path.resolve(assetsDir, input)});
    }
    if (input.endsWith('.png')) {
      paths.png.push({ [path.resolve(moduleAssets, input)]: path.resolve(assetsDir, input)});
    }
  }

  //!: Ensure assets directory and tray icon assets exist in the expected location. If not, create/copy them as needed.
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  for (const prop of Object.keys(paths) as (keyof AssetPaths)[]) {
    for (let i = 0; i < paths[prop].length; i++) {
      for (const [src, dest] of Object.entries(paths[prop][i])) {
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    }
  }
};
handleAssets();
/**
 * Writes a PNG tray icon to temp storage from SVG markup and returns a native image.
 * @param {string} str - SVG markup string.
 * @constant {(str: string) => Electron.NativeImage} createNativeFromString Native image loaded from string input.
 */
//!: Helper to generate tray icon from string input.
const createNativeFromString = (str: string) =>  nativeImage.createFromBuffer(Buffer.from(str, "utf-8"));

//!: Define fallback SVG icon as a string literal. This will be used if no valid icon assets are found.
const iconSvg = createNativeFromString(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#2563eb"><path d="M12 3L2 8l10 5 10-5-10-5z"/><path d="M6 11v4c0 1.5 3 3 6 3s6-1.5 6-3v-4l-6 3-6-3z"/><path d="M22 8v5a1 1 0 1 1-2 0V9"/></svg>`);

/**
 * Returns an icon image for Electron tray.
 * @returns {() => Electron.NativeImage} Native image for tray icon.
 */
//!: Main Tray Icon creation logic.
const createSystemImage = (base: string) => {

  //!: Then attempt to load PNG asset, if it exists and is valid.
  if (fs.existsSync(path.resolve(assetsDir, `${base}.png`))) {
    const pngAssetImage = nativeImage.createFromPath(path.resolve(assetsDir, `${base}.png`));
    if (!pngAssetImage.isEmpty()) return pngAssetImage;
  }

  //!: If PNG asset is not available, attempt to load SVG asset, if it exists and is valid.
  if (fs.existsSync(path.resolve(assetsDir, `${base}.svg`))) {
    const svgAssetImage = nativeImage.createFromPath(path.resolve(assetsDir, `${base}.svg`));
    if (!svgAssetImage.isEmpty()) return svgAssetImage;
  }
  //!: If neither asset is available, return a native image created from the fallback SVG string.
  return iconSvg;
};


/**
 * Fetches current installation configuration from system-app.
 * @returns {Promise<InstallationWebsiteConfig | null>} Config when available.
 */
//!: Helper to acquire config from system-app and build Electron menu based on it.
const getConfig = async (): Promise<InstallationWebsiteConfig | null> => {
  try {
    //!: Attempt to fetch config from system-app's local API endpoint.
    const response = await fetch(`${baseUrl}/config`);
    if (!response.ok) return null;

    //!: If response is successful, parse the JSON and return the config object.
    const data = await response.json() as ConfigResponse;
    return data.ok ? data.config : null;
  } catch {
    return null;
  }
};



/**
 * Applies partial config changes in system-app.
 * @param {Partial<InstallationWebsiteConfig>} partial - Changed config fields.
 * @returns {Promise<InstallationWebsiteConfig | null>} Updated config when successful.
 */
//!: Helper to apply config changes from Electron menu interactions.
const updateConfig = async (partial: Partial<InstallationWebsiteConfig>): Promise<InstallationWebsiteConfig | null> => {
  try {
    //!: Attempt to send updated config fields to system-app's local API endpoint.
    const response = await fetch(`${baseUrl}/config/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(partial)
    });
    if (!response.ok) return null;

    //!: If response is successful, parse the JSON and return the updated config object.
    const data = await response.json() as ConfigResponse;
    return data.ok ? data.config : null;
  } catch {
    return null;
  }
};


/**
 * DISCLAIMER: AI Generated - I am not familiar with this implementation of Electron.
 * Sends quit signal to parent launcher process.
 * @returns {void}
 */
//!: Helper to notify electron of quit signal.
const notifyQuit = (): void => {
  const payload: TrayIpcMessage = { type: 'quit' };
  if (process.send) process.send(payload);
};

//!: Helper to build Electron BrowserWindow for config editor.
function initializeWindow (win: BrowserWindow | null = null) {
  //!: If window already exists, just show and focus it.
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
  } else {

    //!: Create new Electron BrowserWindow instance with specified options.
    win = new BrowserWindow({
      width: 640,
      height: 480,
      useContentSize: true,
      resizable: false,
      type: 'utility',
      show: false,
      frame: false,
      title: 'Edu Notification Blocker - Config',
      autoHideMenuBar: true,
      icon: createSystemImage('tray'),
      webPreferences: {
        enablePreferredSizeMode: true,
        /* preload: path.join(__dirname, 'preload.js'), */
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    //!: Once the window's web contents have finished loading, execute JavaScript to calculate the content size and resize the window accordingly.
    win.webContents.once('did-finish-load', () => {

      //!: When webcontents has finished loading, run js to get content dimensions.
      win!.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const body = document.body;
        const html = document.documentElement;

        const width = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
        const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

        resolve({ width, height });
      });
    `).then(({ width, height }) => {

        //!: When the js has finished executing, apply the width and height props where needed.
        if (!win) return undefined as never;
        win.setSize(width, height);

        //!: Catch and handle errors as needed.
      }).catch(err => console.error(err));
    });

    win.on('blur', () => {
      win!.hide();
    });

    //!: Show the window when it's ready. Only runs once per lifecycle.
    win.once('ready-to-show', () => win ? win.show() : undefined);

    //!: If the window is closing, set the reference to null.
    win.on('close', () => {
      if (!win) return undefined;
      win.removeAllListeners();
      win.on('closed', () => {
        win!.destroy();
        win = null;
      });
    });

    //!: Finally, show and focus the window.
    win.show();
    win.focus();
  }
  return win;
}


/**
 * Opens the local config editor in an Electron window.
 * @returns {void}
 */
//!: Main function to open config editor window on menu click and handle its lifecycle.
const openConfigEditor = (): void => {
  //!: Initialize the Electron BrowserWindow.
  electron = initializeWindow(electron);
  void electron.loadURL(`${ baseUrl }/config/edit`);
}

/**
 * Builds tray context menu based on current config.
 * @param {InstallationWebsiteConfig} config - Current config snapshot.
 * @constant {(config: InstallationWebsiteConfig) => Electron.Menu} buildMenu tray context menu.
 */
//!: Generates an Electron Menu template based on the provided configuration, including options to toggle tracking features and open the config editor.
const buildMenu = (config: InstallationWebsiteConfig): Menu => {

  //!: Helper function to toggle config fields when menu items are clicked. It updates the config in system-app and rebuilds the menu with the new config.
  const toggle = async (field: 'trackBlackboard' | 'trackMicrosoft365' | 'trackGoogleWorkspace') => {

    //!: Update the config and collect new website config from the response.
    const updated = await updateConfig({ [field]: !config[field] });

    //!: If update && tray are good, rebuild the menu with updated config. Otherwise, do nothing.
    updated && tray ? tray.setContextMenu(buildMenu(updated)) : undefined;
  };

  //!: Icons for menu items.
  const green = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACOSURBVHgBpZLRDYAgEEOrEzgCozCCGzkCbKArOIlugJvgoRAUNcLRpvGH19TkgFQWkqIohhK8UEaKwKcsOg/+WR1vX+AlA74u6q4FqgCOSzwsGHCwbKliAF89Cv89tWmOT4VaVMoVbOBrdQUz+FrD6XItzh4LzYB1HFJ9yrEkZ4l+wvcid9pTssh4UKbPd+4vED2Nd54iAAAAAElFTkSuQmCC');
  const red = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACTSURBVHgBpZKBCYAgEEV/TeAIjuIIbdQIuUGt0CS1gW1iZ2jIVaTnhw+Cvs8/OYDJA4Y8kR3ZR2/kmazxJbpUEfQ/Dm/UG7wVwHkjlQdMFfDdJMFaACebnjJGyDWgcnZu1/lrCrl6NCoEHJBrDwEr5NrT6ko/UV8xdLAC2N49mlc5CylpYh8wCwqrvbBGLoKGvz8Bfq0QPWEUo/EAAAAASUVORK5CYII=');
  const lamar = createSystemImage('lamar');
  const github = createSystemImage('github');
  const simpleanalytics = createSystemImage('simpleanalytics');
  const googledocs = createSystemImage('googledocs');
  const m365 = createSystemImage('m365');
  const blackboard = createSystemImage('blackboard');




  //!: Define the menu template with dynamic labels and click handlers based on the current config.
  const template: MenuItemConstructorOptions[] = [
    {
      type: 'header',
      label: 'Edu Notification Blocker',
      icon: github,
      click (menuItem, win, event) {
        openConfigEditor();
        electron!.webContents.loadURL("https://www.github.com/matthewrackley/edu-notification-blocker");
        win?.on('closed', () => {
          electron?.webContents.close();
        });
        win?.on('blur', () => {
          electron!.close();
        });
      }
    },
    {
      label: `School Domain: ${config.schoolDomain}`,
      enabled: false,
      type: 'normal',
      icon: lamar,
    },
    { type: 'separator' },
    { type: 'header', label: 'Options' },
    {
      label: 'Track Blackboard',
      type: 'checkbox',
      icon: blackboard,
      checked: config.trackBlackboard,
      click: () => {
        void toggle('trackBlackboard');
      }
    },
    {
      label: 'Track Microsoft 365',
      type: 'checkbox',
      icon: m365,
      checked: config.trackMicrosoft365,
      click: () => {
        void toggle('trackMicrosoft365');
      }
    },
    {
      label: 'Track Google Workspace',
      type: 'checkbox',
      icon: googledocs,
      checked: config.trackGoogleWorkspace,
      click: () => {
        void toggle('trackGoogleWorkspace');
      }
    },
    { type: 'separator' },
    {
      label: 'Open Config Editor',
      click: () => {
        openConfigEditor();
      }
    },
    {
      label: 'Quit',
      click: () => {
        notifyQuit();
        app.quit();
      }
    }
  ];

  return Menu.buildFromTemplate(template);
};

/**
 * Initializes Electron tray app.
 * @returns {Promise<void>} Resolves once tray has been created.
 */
const bootstrap = async (): Promise<void> => {
  await app.whenReady();
  const config = await getConfig();
  if (!config) {
    console.warn('Electron tray unavailable: could not load config from system-app.');
    app.quit();
    return;
  }

  tray = new Tray(createSystemImage('tray'));
  tray.setToolTip('Edu Notification Blocker');
  tray.setContextMenu(buildMenu(config));
  tray.on('click', () => {
    tray ? tray.popUpContextMenu() : undefined;
  });
  app.on('window-all-closed', () => undefined);
};

void bootstrap();
