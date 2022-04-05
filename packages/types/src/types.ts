import { Types, Document } from "mongoose";

export interface IChain {
  id: string;
  ticker: string;
  network: string;
  description: string;
  appCount?: number;
  isAvailableForStaking: boolean;
}

export interface IGatewaySettings {
  secretKey: string;
  secretKeyRequired: boolean;
  whitelistOrigins: string[];
  whitelistUserAgents: string[];
  whitelistContracts: { blockchainID: string; contracts: string[] }[];
  whitelistMethods: { blockchainID: string; methods: string[] }[];
}

export interface INotificationSettings {
  signedUp: boolean;
  quarter: boolean;
  quarterLastSent?: Date | number;
  half: boolean;
  halfLastSent?: Date | number;
  threeQuarters: boolean;
  threeQuartersLastSent?: Date | number;
  full: boolean;
  fullLastSent?: Date | number;
  createdAt?: Date | number;
}
