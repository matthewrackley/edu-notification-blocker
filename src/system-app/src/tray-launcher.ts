import { spawn } from 'node:child_process';
import path from 'node:path';

/**
 * I am very familiar with Electron applications, however I did use AI to speed up the set up.
 */
/**
 * IPC message shape used between tray launcher and parent process.
 */
interface TrayIpcMessage {
  type?: 'quit';
}

/**
 * Starts the Electron tray process and forwards quit events to parent.
 * @returns {void}
 */
const bootstrapTray = (): void => {
  // The first check is always the same for electron apps
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    console.warn('Electron tray disabled: no desktop session detected.');
    process.exit(0);
  }

  // importing electron like this allows us to get the correct binary path
  const electronBinaryPath = require('electron') as string;

  // One convention with Electron is for its main file to be main.js
  // The main.js file is the entry point for the Electron tray process
  const electronMainPath = path.join(__dirname, 'electron-tray', 'main.js');

  // Here we actually set up the child process for the electron tray. We also set up IPC communication and forward quit events to the parent process.
  const trayProcess = spawn(electronBinaryPath, // Here we spawn the electron binary
    [electronMainPath], /* and pass our electron app itself as an argument */ {
    env: {
      ...process.env,
      SYSTEM_APP_PORT: String(process.env.SYSTEM_APP_PORT || 42424)
    },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });

  // Handle IPC message
  trayProcess.on('message', (message: TrayIpcMessage) => {
    if (message?.type !== 'quit') return;
    if (process.send) process.send({ type: 'quit' });
  });

  // Handle error
  trayProcess.on('error', (error) => {
    console.warn(`Electron tray failed to start: ${error.message}`);
    process.exit(1);
  });

  // Handle exit
  trayProcess.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  // handle disconnect
  process.on('disconnect', () => {
    trayProcess.kill();
  });
};

bootstrapTray();
