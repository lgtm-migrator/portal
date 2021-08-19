import * as dotenv from 'dotenv'
dotenv.config()

export type AuthKeys = {
  publicSecret: string
  privateSecret: string
  secretKey: string
  expiration: string
  refreshExpiration: string
}

export type PersistenceKeys = {
  url: string
  dbUser: string
  dbPassword: string
  dbName: string
  dbEncryptionKey: string
}

export type PocketNetworkKeys = {
  aatVersion: string
  blockTime: string
  chainId: string
  clientPubKey: string
  transactionFee: string
  maxDispatchers: string
  requestTimeout: string
  maxSessions: string
  freeTierFundAccount: string
  freeTierFundAddress: string
  freeTierClientPubKey: string
  dispatchers: string
  chainHash: string
  providerType: string
  httpProviderNode: string
  mainFundAccount: string
  mainFundAddress: string
}

export const ENV_VARS = {
  prod(): boolean {
    return process.env.NODE_ENV === 'production'
  },
  FRONTEND_URL(): string {
    return process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  ALLOWED_DOMAINS(): string[] {
    return process.env.ALLOWED_DOMAINS?.split(',') ?? ['http://localhost:3000']
  },
  CLOUDWATCH_GROUP_NAME(): string {
    return process.env.CLOUDWATCH_GROUP_NAME?.trim() ?? ''
  },
  CLOUDWATCH_ACCESS_KEY(): string {
    return process.env.CLOUDWATCH_ACCESS_KEY?.trim() ?? ''
  },
  CLOUDWATCH_SECRET_KEY(): string {
    return process.env.CLOUDWATCH_SECRET_KEY?.trim() ?? ''
  },
  CLOUDWATCH_REGION(): string {
    return process.env.CLOUDWATCH_REGION?.trim() ?? ''
  },
  ENABLE_WORKERS(): boolean {
    return process.env.ENABLE_WORKERS === 'true' || false
  },
  HASURA_SECRET(): string {
    return process.env.HASURA_ADMIN_SECRET || ''
  },
  HASURA_URL(): string {
    return process.env.HASURA_URL?.trim() ?? ''
  },
  INFLUX_ENDPOINT(): string {
    return process.env.INFLUX_ENDPOINT?.trim() ?? ''
  },
  INFLUX_ORG(): string {
    return process.env.INFLUX_ORG?.trim() ?? ''
  },
  INFLUX_TOKEN(): string {
    return process.env.INFLUX_TOKEN?.trim() ?? ''
  },
  AUTH(): AuthKeys {
    return {
      publicSecret: process.env.JWT_PUBLIC_SECRET?.replace(/\\n/gm, '\n') ?? '',
      privateSecret:
        process.env.JWT_PRIVATE_SECRET?.replace(/\\n/gm, '\n') ?? '',
      secretKey: process.env.JWT_SECRET_KEY,
      expiration: process.env.JWT_EXPIRATION,
      refreshExpiration: process.env.JWT_REFRESH_EXPIRATION,
    }
  },
  EMAIL_API_KEY(): string {
    return process.env.EMAIL_API_KEY?.trim() ?? ''
  },
  EMAIL_FROM(): string {
    return process.env.EMAIL_FROM
  },
  // TODO: Refactor to have better names
  PERSISTENCE(): PersistenceKeys {
    return {
      url: process.env.DATABASE_URL,
      dbUser: process.env.DATABASE_USER,
      dbPassword: process.env.DATABASE_PASSWORD,
      dbName: process.env.DATABASE_NAME,
      dbEncryptionKey: process.env.DATABASE_ENCRYPTION_KEY,
    }
  },
  POCKET_NETWORK(): PocketNetworkKeys {
    return {
      aatVersion: process.env.POCKET_NETWORK_AAT_VERSION,
      blockTime: process.env.POCKET_NETWORK_BLOCK_TIME,
      transactionFee: process.env.POCKET_NETWORK_TRANSACTION_FEE,
      chainId: process.env.POCKET_NETWORK_CHAIN_ID,
      maxDispatchers: process.env.POCKET_NETWORK_MAX_DISPATCHER,
      requestTimeout: process.env.POCKET_NETWORK_REQUEST_TIMEOUT,
      maxSessions: process.env.POCKET_NETWORK_MAX_SESSIONS,
      freeTierFundAccount: process.env.POCKET_NETWORK_FREE_TIER_FUND_ACCOUNT,
      freeTierFundAddress: process.env.POCKET_NETWORK_FREE_TIER_FUND_ADDRESS,
      freeTierClientPubKey: process.env.POCKET_NETWORK_CLIENT_PUB_KEY,
      dispatchers: process.env.POCKET_NETWORK_DISPATCHERS,
      chainHash: process.env.POCKET_NETWORK_CHAIN_HASH,
      providerType: process.env.POCKET_NETWORK_PROVIDER_TYPE,
      httpProviderNode: process.env.POCKET_NETWORK_HTTP_PROVIDER_NODE,
      mainFundAccount: process.env.POCKET_NETWORK_MAIN_FUND_ACCOUNT,
      mainFundAddress: process.env.POCKET_NETWORK_MAIN_FUND_ADDRESS,
      clientPubKey: process.env.POCKET_NETWORK_CLIENT_PUB_KEY,
    }
  },
  REDIS_ENDPOINT(): string {
    return process.env.REDIS_ENDPOINT?.trim() ?? ''
  },
  GODMODE_ACCOUNTS(): string[] {
    return process.env.GODMODE_ACCOUNTS?.trim().split(',') ?? []
  },
}

type envVarCategory =
  | 'prod'
  | 'ALLOWED_DOMAINS'
  | 'AUTH'
  | 'CLOUDWATCH_ACCESS_KEY'
  | 'CLOUDWATCH_GROUP_NAME'
  | 'CLOUDWATCH_SECRET_KEY'
  | 'CLOUDWATCH_REGION'
  | 'EMAIL_API_KEY'
  | 'EMAIL_FROM'
  | 'ENABLE_WORKERS'
  | 'FRONTEND_URL'
  | 'GODMODE_ACCOUNTS'
  | 'HASURA_SECRET'
  | 'HASURA_URL'
  | 'INFLUX_ENDPOINT'
  | 'INFLUX_TOKEN'
  | 'INFLUX_ORG'
  | 'PERSISTENCE'
  | 'POCKET_NETWORK'
  | 'REDIS_ENDPOINT'

/**
 * Returns the corresponding object for the named passed
 *
 * @param {string} name name of the environment block
 *
 * @returns {object} object with scoped environment variables
 *
 */
export default function env(
  name: envVarCategory
):
  | string
  | string[]
  | boolean
  | AuthKeys
  | PersistenceKeys
  | PocketNetworkKeys {
  // @ts-ignore
  return ENV_VARS[name]()
}
