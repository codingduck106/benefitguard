export interface AllowlistedPage {
  id: string;
  url: string;
  agency: string;
  topic: string;
  enabled: boolean;
  refreshDays: number;
}

export interface Snapshot {
  id: string;
  url: string;
  agency: string;
  topic: string;
  fetchedAt: string;
  contentHash: string;
  text: string;
}
