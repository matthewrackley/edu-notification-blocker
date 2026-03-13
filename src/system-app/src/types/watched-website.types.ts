export type WebsiteProviderType =
  | 'SCHOOL'
  | 'BLACKBOARD'
  | 'MICROSOFT_365'
  | 'GOOGLE_WORKSPACE';

export interface WebsiteMatchResult {
  isWatched: boolean;
  provider: WebsiteProviderType | null;
  matchedHostname: string | null;
  reason: string | null;
}
