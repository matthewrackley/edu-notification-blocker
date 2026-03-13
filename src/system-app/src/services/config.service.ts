import fs from 'fs';
import path from 'path';
import { env } from '../utils/env';
import { InstallationWebsiteConfig } from '../types/installation.types';


class ConfigService {
  private static configPath = env.installConfig;
  private static configFile = env.installConfigFile;
  private _config: InstallationWebsiteConfig = {
  schoolDomain: 'lamar.edu',
  trackBlackboard: true,
  trackMicrosoft365: true,
  trackGoogleWorkspace: false
};
  get config() {
    return this._config;
  }
  get configPath () {
    return ConfigService.configPath;
  }
  private static get initialized() {
    if (fs.existsSync(ConfigService.configFile)) {
      return true;
    }
    return false;
  };

  // Singleton instance implementation
  private static instance: ConfigService;
  private constructor() {
    // If the service has already been initialized, then
    if (ConfigService.initialized) {
      return ConfigService.instance;
    } else {
      this.saveToFile(ConfigService.configFile);
      return ConfigService.instance;
    }
  }
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Loads the configuration from a file. If the file does not exist, it will create one with default values.
   * @param {string} filePath - The path to the configuration file. If not provided, it will use the default path.
   * @returns {InstallationWebsiteConfig} The loaded configuration object.
   * @throws Will throw an error if the configuration file is invalid or cannot be read.
   */
  loadFromFile(filePath: string = ConfigService.configFile): InstallationWebsiteConfig {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      console.warn(`Config file not found at ${absolutePath}, using default configuration.`);
      return this._config;
    }

    const raw = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<InstallationWebsiteConfig>;
    return this._config = this.validate(parsed);
  }

  validate = (partial: Partial<InstallationWebsiteConfig>): InstallationWebsiteConfig => ({
      schoolDomain: typeof partial.schoolDomain === 'string' ? partial.schoolDomain : this._config.schoolDomain,
      trackBlackboard: typeof partial.trackBlackboard === 'boolean' ? partial.trackBlackboard : this._config.trackBlackboard,
      trackMicrosoft365: typeof partial.trackMicrosoft365 === 'boolean' ? partial.trackMicrosoft365 : this._config.trackMicrosoft365,
      trackGoogleWorkspace: typeof partial.trackGoogleWorkspace === 'boolean' ? partial.trackGoogleWorkspace : this._config.trackGoogleWorkspace
    });

  updateConfig(partial: Partial<InstallationWebsiteConfig>): InstallationWebsiteConfig {
    return this._config = this.validate(partial);
  }

  /**
   * Saves the current configuration to a file. If the file does not exist, it will be created along with any necessary directories.
   * @param {string} filePath - The path to the configuration file. If not provided, it will use the default path.
   * @returns {InstallationWebsiteConfig} The configuration object that was saved.
   * @throws Will throw an error if the configuration cannot be saved due to file system issues.
   */
  saveToFile(filePath: string = ConfigService.configFile): InstallationWebsiteConfig {
    const absolutePath = path.resolve(filePath);
    const folderPath = path.dirname(absolutePath);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFileSync(absolutePath, JSON.stringify(this._config, null, 2), 'utf-8');

    return this._config;
  }
}

export const configService = ConfigService.getInstance();
