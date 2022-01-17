import { IGatewaySettings, INotificationSettings } from "./types";

export type IAppInfo = {
  address: string;
  appId: string;
  publicKey: string;
};

export type UserLB = {
  apps: IAppInfo[];
  chain: string;
  createdAt?: Date | number;
  freeTier: boolean;
  gatewaySettings: IGatewaySettings;
  id: string;
  name: string;
  notificationSettings: INotificationSettings;
  status: string;
  updatedAt?: Date | number;
  user?: string;
};

export type UserLBResponse = UserLB[];

export type UserLBOnChainData = {
  stake: number;
  relays: number;
};

export type UserLBOnChainDataResponse = UserLBOnChainData;

export type UserLBTotalRelaysResponse = {
  total_relays: number;
};

export type UserLBTotalSuccessfulRelaysResponse = {
  successful_relays: number;
};

export type UserLBDailyRelayBucket = {
  bucket: string;
  daily_relays: number;
};

export type UserLBDailyRelaysResponse = {
  daily_relays: UserLBDailyRelayBucket[];
};

export type UserLBSessionRelaysResponse = {
  session_relays: number;
};

export type UserLBPreviousTotalRelaysResponse = {
  total_relays: number;
};

export type UserLBPreviousTotalSuccessfulRelaysResponse = {
  successful_relays: number;
};

export type UserLBLatencyBucket = {
  bucket: string;
  latency: number;
};

export type UserLBHistoricalLatencyResponse = {
  hourly_latency: UserLBLatencyBucket[];
};

export type UserLBOriginBucket = {
  count: number;
  origin: string;
};

export type UserLBHistoricalOriginFrequencyResponse = {
  origin_classification: UserLBOriginBucket[];
};

export type UserLBErrorBucket = {
  bytes: number;
  message: string;
  method: string;
  nodeaddress: string;
  timestamp: number;
};

export type UserLBErrorMetricsResponse = UserLBErrorBucket[];
