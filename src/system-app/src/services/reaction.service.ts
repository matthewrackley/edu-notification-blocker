import { WebsiteStateResponse } from '../types/website.types';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// execFileAsync is a promisified version of execFile. Which should have been async to begin with.
const execFileAsync = promisify(execFile);

/**
 * Executes a command and returns its numeric exit code.
 * @param {string} command - Command executable.
 * @param {string[]} args - Command arguments.
 * @returns {Promise<number>} Exit code where 0 indicates success.
 */
const getExitCode = async (command: string, args: string[]): Promise<number> => {
  try {
    await execFileAsync(command, args);
    return 0;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException & { code?: number | string }).code;
    return typeof code === 'number' ? code : 1;
  }
};

interface NotificationBackend {
  mute(): Promise<void>;
  unmute(): Promise<void>;
  name: string;
}

/**
 * **DISCLAIMER:** *AI Generated* - I would not know where to begin to handling notifications in gnome.
 * If the desktop environment is detected as GNOME and the `gsettings` command is available:
 * Then the GnomeBackend will be used to manage notifications.
 * This backend uses the `gsettings` command to enable or disable notification banners in GNOME.
 */
class GnomeBackend implements NotificationBackend {
  public name = 'gnome';

  async mute(): Promise<void> {
    await execFileAsync('gsettings', [
      'set',
      'org.gnome.desktop.notifications',
      'show-banners',
      'false'
    ]);
  }

  async unmute(): Promise<void> {
    await execFileAsync('gsettings', [
      'set',
      'org.gnome.desktop.notifications',
      'show-banners',
      'true'
    ]);
  }
}
/**
 * If the desktop environment is detected as XFCE and the `xfconf-query` command is available:
 * Then the XfceBackend will be used to manage notifications.
 * This backend uses the `xfconf-query` command to enable or disable the "do not disturb" mode in XFCE, which effectively mutes notifications.
 */
class XfceBackend implements NotificationBackend {
  public name = 'xfce';
  // The XfceBackend checks for the existence of the "do not disturb" property in xfce4-notifyd, and if it doesn't exist, it creates it.
  // This is necessary because some versions of xfce4-notifyd may not have this property by default, but it is required for muting notifications in XFCE.
  private async handleDoNotDisturb() {
    const exitCode = await getExitCode('xfconf-query', [
      '-c',
      'xfce4-notifyd',
      '-p',
      '/do-not-disturb'
    ]);
    if (exitCode !== 0) {
      await execFileAsync('xfconf-query', [
        '-c', 'xfce4-notifyd', '-p', '/do-not-disturb',
        '-n', '-t', 'bool', '-s', 'false'
      ]);
      this._dnd = true;
    }
  }
  private _dnd = false;
  private get dndExists() {
    if (!this._dnd) {
      setTimeout(() => void this.handleDoNotDisturb(), 1000);
      this._dnd = true;
    };
    return this._dnd;
  }
  constructor() {
    void this.handleDoNotDisturb();
  }
  async mute(): Promise<void> {
    if (!this.dndExists) return;
    await execFileAsync('xfconf-query', [
      '-c',
      'xfce4-notifyd',
      '-p',
      '/do-not-disturb',
      '-s',
      'true'
    ]);
  }

  async unmute(): Promise<void> {
    if (!this.dndExists) return;
    await execFileAsync('xfconf-query', [
      '-c',
      'xfce4-notifyd',
      '-p',
      '/do-not-disturb',
      '-s',
      'false'
    ]);
  }
}
/**
 * **DISCLAIMER:** *AI Generated* - I have never even heard of Dunst.
 * If dunst is detected (by checking for the availability of the `dunstctl` command), the DunstBackend will be used to manage notifications. This backend uses the `dunstctl` command to pause and unpause notifications in Dunst, which effectively mutes and unmutes notifications.
 */
class DunstBackend implements NotificationBackend {
  public name = 'dunst';

  async mute(): Promise<void> {
    await execFileAsync('dunstctl', ['set-paused', 'true']);
  }

  async unmute(): Promise<void> {
    await execFileAsync('dunstctl', ['set-paused', 'false']);
  }
}

/**
 * If no supported notification backend is detected, the NoopBackend will be used. This is a skeleton backend.
 */
class NoopBackend implements NotificationBackend {
  public name = 'noop';

  async mute(): Promise<void> {
    console.warn('No supported notification backend detected; mute skipped');
  }

  async unmute(): Promise<void> {
    console.warn('No supported notification backend detected; unmute skipped');
  }
}

export interface WebsiteState {
  monitoredMode: boolean;
  state: WebsiteStateResponse;
}

/**
 * **DISCLAIMER:** *AI Generated* - I am unfamiliar with the different backends except for XFCE which I use personally.
 * Detects which desktop environment is currently in use and returns proper methods for modifying notifications based on the detected environment.
 */
async function detectBackend () {
  async function commandExists(command: string): Promise<boolean> {
    try {
      await execFileAsync('sh', ['-c', `command -v ${command}`]);
      return true;
    } catch {
      return false;
    }
  }
  const desktop = (
    process.env.XDG_CURRENT_DESKTOP ||
    process.env.DESKTOP_SESSION ||
    ''
  ).toLowerCase();

  if (desktop.includes('xfce') && await commandExists('xfconf-query')) {
    return new XfceBackend();
  }
  if (desktop.includes('gnome') && await commandExists('gsettings')) {
    return new GnomeBackend();
  }
  if (await commandExists('dunstctl')) {
    return new DunstBackend();
  }

  return new NoopBackend();
};

/**
 * The ReactionService class manages the state of notification muting based on website activity.
 * It uses a specified NotificationBackend to mute or unmute notifications when the user is active on monitored websites.
 */
class ReactionService {
  private backend: NotificationBackend = new NoopBackend();
  // Singleton implementation
  private static instance: ReactionService;
  private constructor(backend: NotificationBackend) {
    this.backend = backend;
  }
  // Async singleton initializer to allow for async backend detection
  public static async getInstance(): Promise<ReactionService> {
    if (!ReactionService.instance) {
      const backend = await detectBackend();
      ReactionService.instance = new ReactionService(backend);
    }
    return ReactionService.instance;
  }
  // Count of active monitored website entries
  private count = 0;
  private get active() {
    return this.count > 0;
  }

  private async activate(): Promise<void> {
    await this.backend.mute();
  }
  private async deactivate(): Promise<void> {
    await this.backend.unmute();
  }

  // Handles activity changes via the count of active monitored website entries, activating or deactivating the notification muting as needed.
  async handleActivity(count: number) {
    this.count = count;
    if (this.active) {
        await this.activate();
    } else {
        await this.deactivate();
    }
  }
}

export const reactionService = ReactionService.getInstance();
