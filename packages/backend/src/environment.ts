import * as dotenv from 'dotenv'
dotenv.config()

export type PocketNetworkKeys = {
  aatVersion: string
  blockTime: string
  chainId: string
  clientPubKey: string
  transactionFee: string
  maxDispatchers: string
  requestTimeout: string
  maxSessions: string
  freeTierClientPubKey: string
  dispatchers: string
  chainHash: string
  providerType: string
  mainFundAccount: string
  mainFundAddress: string
}

export const ENV_VARS = {
  // String vars
  AUTH0_JWKS_URI() {
    return process.env.AUTH0_JWKS_URI?.trim() ?? ''
  },
  AUTH0_AUDIENCE() {
    return process.env.AUTH0_AUDIENCE?.trim() ?? ''
  },
  AUTH0_ISSUER() {
    return process.env.AUTH0_ISSUER?.trim() ?? ''
  },
  AUTH0_DOMAIN_URL() {
    return process.env.AUTH0_DOMAIN_URL?.trim() ?? ''
  },
  AUTH0_MGMT_ACCESS_TOKEN() {
    return process.env.AUTH0_MGMT_ACCESS_TOKEN?.trim() ?? ''
  },
  FRONTEND_URL() {
    return process.env.FRONTEND_URL || 'http://localhost:3001'
  },
  ERROR_METRICS_URL() {
    return process.env.ERROR_METRICS_URL?.trim() ?? ''
  },
  AMPLITUDE_API_KEY() {
    return process.env.AMPLITUDE_API_KEY?.trim() ?? ''
  },
  CLOUDWATCH_GROUP_NAME() {
    return process.env.CLOUDWATCH_GROUP_NAME?.trim() ?? ''
  },
  CLOUDWATCH_ACCESS_KEY() {
    return process.env.CLOUDWATCH_ACCESS_KEY?.trim() ?? ''
  },
  CLOUDWATCH_SECRET_KEY() {
    return process.env.CLOUDWATCH_SECRET_KEY?.trim() ?? ''
  },
  CLOUDWATCH_REGION() {
    return process.env.CLOUDWATCH_REGION?.trim() ?? ''
  },
  HASURA_SECRET() {
    return process.env.HASURA_ADMIN_SECRET || ''
  },
  HASURA_URL() {
    return process.env.HASURA_URL?.trim() ?? ''
  },
  INFLUX_ENDPOINT() {
    return process.env.INFLUX_ENDPOINT?.trim() ?? ''
  },
  INFLUX_ORG() {
    return process.env.INFLUX_ORG?.trim() ?? ''
  },
  INFLUX_TOKEN() {
    return process.env.INFLUX_TOKEN?.trim() ?? ''
  },
  JWT_PUBLIC_KEY() {
    return process.env.JWT_PUBLIC_SECRET?.replace(/\\n/gm, '\n') ?? ''
  },
  JWT_PRIVATE_KEY() {
    return process.env.JWT_PRIVATE_SECRET?.replace(/\\n/gm, '\n') ?? ''
  },
  SECRET_KEY() {
    return process.env.JWT_SECRET_KEY || ''
  },
  EMAIL_API_KEY() {
    return process.env.EMAIL_API_KEY?.trim() ?? ''
  },
  EMAIL_FROM() {
    return process.env.EMAIL_FROM
  },
  DATABASE_URL() {
    return process.env.DATABASE_URL?.trim() ?? ''
  },
  DATABASE_USER() {
    return process.env.DATABASE_USER?.trim() ?? ''
  },
  DATABASE_PASSWORD() {
    return process.env.DATABASE_PASSWORD?.trim() ?? ''
  },
  DATABASE_NAME() {
    return process.env.DATABASE_NAME?.trim() ?? ''
  },
  DATABASE_ENCRYPTION_KEY() {
    return process.env.DATABASE_ENCRYPTION_KEY?.trim() ?? ''
  },
  FREE_TIER_ACCOUNT_PRIVATE_KEY() {
    return process.env.POCKET_NETWORK_FREE_TIER_FUND_ACCOUNT
  },
  FREE_TIER_ACCOUNT_ADDRESS() {
    return process.env.POCKET_NETWORK_FREE_TIER_FUND_ADDRESS
  },
  POCKET_PROVIDER_NODE() {
    return process.env.POCKET_NETWORK_HTTP_PROVIDER_NODE
  },
  PROD_DB_URL() {
    return process.env.PROD_DB_URL
  },
  REDIS_ENDPOINT() {
    return process.env.REDIS_ENDPOINT?.trim() ?? ''
  },

  // String Array Vars
  ALLOWED_DOMAINS(): string[] {
    return process.env.ALLOWED_DOMAINS?.split(',') ?? ['http://localhost:3001']
  },
  GODMODE_ACCOUNTS(): string[] {
    return process.env.GODMODE_ACCOUNTS?.trim().split(',') ?? []
  },

  // Boolean vars
  ENABLE_WORKERS() {
    return process.env.ENABLE_WORKERS === 'true' || false
  },
  PROD() {
    return process.env.NODE_ENV === 'production'
  },

  // Pocket Network Vars
  POCKET_NETWORK(): PocketNetworkKeys {
    return {
      aatVersion: process.env.POCKET_NETWORK_AAT_VERSION,
      blockTime: process.env.POCKET_NETWORK_BLOCK_TIME,
      transactionFee: process.env.POCKET_NETWORK_TRANSACTION_FEE,
      chainId: process.env.POCKET_NETWORK_CHAIN_ID,
      maxDispatchers: process.env.POCKET_NETWORK_MAX_DISPATCHER,
      requestTimeout: process.env.POCKET_NETWORK_REQUEST_TIMEOUT,
      maxSessions: process.env.POCKET_NETWORK_MAX_SESSIONS,
      freeTierClientPubKey: process.env.POCKET_NETWORK_CLIENT_PUB_KEY,
      dispatchers: process.env.POCKET_NETWORK_DISPATCHERS,
      chainHash: process.env.POCKET_NETWORK_CHAIN_HASH,
      providerType: process.env.POCKET_NETWORK_PROVIDER_TYPE,
      mainFundAccount: process.env.POCKET_NETWORK_MAIN_FUND_ACCOUNT,
      mainFundAddress: process.env.POCKET_NETWORK_MAIN_FUND_ADDRESS,
      clientPubKey: process.env.POCKET_NETWORK_CLIENT_PUB_KEY,
    }
  },
}

type IStringVars =
  | 'AMPLITUDE_API_KEY'
  | 'AUTH0_AUDIENCE'
  | 'AUTH0_ISSUER'
  | 'AUTH0_JWKS_URI'
  | 'AUTH0_DOMAIN_URL'
  | 'AUTH0_MGMT_ACCESS_TOKEN'
  | 'CLOUDWATCH_ACCESS_KEY'
  | 'CLOUDWATCH_GROUP_NAME'
  | 'CLOUDWATCH_REGION'
  | 'CLOUDWATCH_SECRET_KEY'
  | 'DATABASE_ENCRYPTION_KEY'
  | 'DATABASE_NAME'
  | 'DATABASE_PASSWORD'
  | 'DATABASE_URL'
  | 'DATABASE_USER'
  | 'EMAIL_API_KEY'
  | 'EMAIL_FROM'
  | 'ERROR_METRICS_URL'
  | 'FREE_TIER_ACCOUNT_ADDRESS'
  | 'FREE_TIER_ACCOUNT_PRIVATE_KEY'
  | 'FRONTEND_URL'
  | 'HASURA_SECRET'
  | 'HASURA_URL'
  | 'INFLUX_ENDPOINT'
  | 'INFLUX_ORG'
  | 'INFLUX_TOKEN'
  | 'JWT_PRIVATE_KEY'
  | 'JWT_PUBLIC_KEY'
  | 'POCKET_PROVIDER_NODE'
  | 'PROD_DB_URL'
  | 'REDIS_ENDPOINT'
  | 'SECRET_KEY'
type IStringArrayVars = 'ALLOWED_DOMAINS' | 'GODMODE_ACCOUNTS'
type IBooleanVars = 'ENABLE_WORKERS' | 'PROD'
type IPocketNetworkKeys = 'POCKET_NETWORK'

type IEnvVars =
  | IStringVars
  | IStringArrayVars
  | IBooleanVars
  | IPocketNetworkKeys

/**
 * Returns the corresponding object for the named passed
 *
 * @param {string} name name of the environment block
 *
 * @returns {object} object with scoped environment variables
 *
 */
export default function env<B extends IEnvVars>(
  name: B
): B extends IStringVars
  ? string
  : B extends IStringArrayVars
  ? string[]
  : B extends IBooleanVars
  ? boolean
  : PocketNetworkKeys {
  return ENV_VARS[name]() as B extends IStringVars
    ? string
    : B extends IStringArrayVars
    ? string[]
    : B extends IBooleanVars
    ? boolean
    : PocketNetworkKeys
}
