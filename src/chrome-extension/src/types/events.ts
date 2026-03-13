export type WebsiteEventType =
  | 'ENTER'
  | 'LEAVE'
  | 'UPDATE'
  | 'CLOSE'
  | 'HEARTBEAT';

export type WebsiteProviderType =
  | 'SCHOOL'
  | 'BLACKBOARD'
  | 'MICROSOFT_365'
  | 'GOOGLE_WORKSPACE';

export interface WebsiteEventPayload {
  type: WebsiteEventType;
  hostname?: string;
  url?: string;
  tabId?: number;
  windowId: number;
  timestamp?: number;
}

export interface InstallationConfig {
  schoolDomain: string;
  trackBlackboard: boolean;
  trackMicrosoft365: boolean;
  trackGoogleWorkspace: boolean;
}

export interface MatchResult {
  isWatched: boolean;
  provider: WebsiteProviderType | null;
}

export interface TrackedTabSnapshot {
  tabId: number;
  windowId: number;
  url: string;
  hostname: string;
  isWatched: boolean;
  provider: WebsiteProviderType | null;
}
