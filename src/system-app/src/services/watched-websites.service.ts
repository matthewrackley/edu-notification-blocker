import { configService } from './config.service';
import { WebsiteMatchResult } from '../types/watched-website.types';

/**
 * This class is responsible for matching and tracking watched sites
 */
class WatchedWebsitesService {
  hostname: string;
  private get schoolDomain() {
    return this.normalizeDomain(this.hostname);
  }
  /**
   * Normalizes a hostname by trimming whitespace and converting to lowercase.
   * It also attempts to parse the hostname as a URL to extract the hostname component,
   * which helps ensure consistency when comparing or storing hostnames.
   */
  normalizeDomain = (input: string): string => {
    const value = input.trim().toLowerCase();
    try {
      const withProtocol = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
      const url = new URL(withProtocol).hostname;
      console.log("Normalized URL:", url);
      return url;
    } catch {
      return value.replace(/^www\./, '');
    }
  }
  /**
   * Checks if the given hostname matches the target hostname either as an exact match or as a subdomain.
   */
  private matchesExactOrSubdomain(hostname: string, target: string): boolean {
    const normalizedHostname = this.normalizeDomain(hostname);
    const normalizedTarget = this.normalizeDomain(target);
    return (
      normalizedHostname === normalizedTarget ||
      normalizedHostname.endsWith(`.${normalizedTarget}`)
    );
  }
  /**
   * Singleton pattern
   */
  private static instance: WatchedWebsitesService;
  private constructor() {
    const config = configService.config;
    this.hostname = config.schoolDomain;
  }
  static getInstance(): WatchedWebsitesService {
    if (!WatchedWebsitesService.instance) {
      WatchedWebsitesService.instance = new WatchedWebsitesService();
    }
    return WatchedWebsitesService.instance;
  }

  /**
   * Quick check to see if the provided hostname matches the school domain.
   */
  private isSchoolWebsite(hostname: string): boolean {
    return this.matchesExactOrSubdomain(hostname, this.schoolDomain);
  }
  private matchesAny(hostname: string, ...domains: string[]) {
    return domains.some(domain => this.matchesExactOrSubdomain(hostname, domain));
  }
  /**
   * Quick check to see if the provided hostname matches known blackboard domains.
   */
  private isBlackboardWebsite(hostname: string): boolean {
    const blackboardDomains = [
      'blackboard.com',
      'blackboardcdn.com'
    ];
    return this.matchesAny(hostname, ...blackboardDomains);
  }

  /**
   * Quick check to see if the provided hostname matches any office 365 domains.
   */
  private isMicrosoft365Website(hostname: string): boolean {
    const microsoftDomain = 'm365.cloud.microsoft.com';

    return this.matchesExactOrSubdomain(hostname, microsoftDomain);
  }
  /**
   * Quick check to see if the provided hostname matches any google workspace domains. For simplicity, we are only checking for docs.google.com in this example, but this could be expanded to include other google workspace services if desired.
   */
  private isGoogleWorkspaceWebsite(hostname: string): boolean {
    const googleDomain = "docs.google.com";

    return this.matchesExactOrSubdomain(hostname, googleDomain);
  }

  /**
   * Determins if a given hostname matches any of the watched website rules defined in the config.
   */
  getMatch(hostname: string): WebsiteMatchResult {
    // load our config each time for simplicity
    const config = configService.loadFromFile();
    this.hostname = config.schoolDomain;
    const normalizedHostname = this.normalizeDomain(hostname);

    if (!normalizedHostname) {
      return {
        isWatched: false,
        provider: null,
        matchedHostname: null,
        reason: 'Hostname is empty'
      };
    }

    if (this.isSchoolWebsite(normalizedHostname)) {
      return {
        isWatched: true,
        provider: 'SCHOOL',
        matchedHostname: config.schoolDomain,
        reason: 'Matched selected school domain'
      };
    }

    if (this.isBlackboardWebsite(normalizedHostname)) {
      return {
        isWatched: config.trackBlackboard ? true : false,
        provider: 'BLACKBOARD',
        matchedHostname: normalizedHostname,
        reason: 'Matched Blackboard'
      };
    }

    if (this.isMicrosoft365Website(normalizedHostname)) {
      return {
        isWatched: config.trackMicrosoft365 ? true : false,
        provider: 'MICROSOFT_365',
        matchedHostname: normalizedHostname,
        reason: 'Matched Microsoft 365'
      };
    }

    if (this.isGoogleWorkspaceWebsite(normalizedHostname)) {
      return {
        isWatched: config.trackGoogleWorkspace ? true : false,
        provider: 'GOOGLE_WORKSPACE',
        matchedHostname: normalizedHostname,
        reason: 'Matched Google Workspace'
      };
    }

    return {
      isWatched: false,
      provider: null,
      matchedHostname: null,
      reason: 'Hostname does not match enabled watched website rules'
    };
  }

  isWatched(hostname: string): boolean {
    return this.getMatch(hostname).isWatched;
  }
}

export const watchedWebsitesService = WatchedWebsitesService.getInstance();
export default watchedWebsitesService;
