import env from '../environment'
import { fillAppPool, stakeAppPool } from './application'
import { getAppsPerChain } from './network'
import { notifyUsage } from './notifications'

import {
  categorizeAppRemoval,
  removeFundsFromApps,
  stakeAppsForSlots,
  transferSlotFunds,
  unstakeApps,
  unstakeLBs,
} from './unstaker'
import {
  ONE_MINUTES,
  FIVE_MINUTES,
  SIXTY_MINUTES,
  SIXTY_MINUTES_OFFSET,
} from './utils'

const TEST_ONLY_CHAINS = {
  POCKET_TESTNET: {
    ticker: 'POKT',
    id: '0002',
    limit: 3,
  },
}

const TEST_CHAINS = {
  ETHEREUM_GOERLI_FULL: {
    ticker: 'ETH',
    id: '0026',
    limit: 2,
  },
  ETHEREUM_RINKEBY_FULL: {
    ticker: 'ETH',
    id: '0025',
    limit: 3,
  },
  ETHEREUM_ROPSTEN_FULL: {
    ticker: 'ETH',
    id: '0023',
    limit: 2,
  },
}

const MAIN_CHAINS = {
  ALGORAND_MAINNET: {
    ticker: 'ALGO',
    id: '0029',
    limit: 0,
  },
  ALGORAND_MAINNET_ARCHIVAL: {
    ticker: 'ALGO',
    id: '000D',
    limit: 0,
  },
  AVAX_MAINNET: {
    ticker: 'AVAX',
    id: '0003',
    limit: 0,
  },
  AVAX_MAINNET_ARCHIVAL: {
    ticker: 'AVAX',
    id: '00A3',
    limit: 0,
  },
  BINANCE_SMART_CHAIN: {
    ticker: 'BSC',
    id: '0004',
    limit: 0,
  },
  ETHEREUM_GOERLI_FULL: {
    ticker: 'ETH',
    id: '0026',
    limit: 0,
  },
  ETHEREUM_KOVAN_FULL: {
    ticker: 'POA',
    id: '0024',
    limit: 0,
  },
  ETHEREUM_MAINNET_ARCHIVAL: {
    ticker: 'ETH',
    id: '0022',
    limit: 0,
  },
  EHEREUM_MAINNET_ARCHIVAL_TRACING: {
    ticker: 'ETH',
    id: '0028',
    limit: 0,
  },
  ETHEREUM_MAINNET_FULL: {
    ticker: 'ETH',
    id: '0021',
    limit: 0,
  },
  ETHEREUM_RINKEBY_FULL: {
    ticker: 'ETH',
    id: '0025',
    limit: 0,
  },
  ETHEREUM_ROPSTEN_FULL: {
    ticker: 'ETH',
    id: '0023',
    limit: 0,
  },
  ETHEREUM_XDAI_ARCHIVAL: {
    ticker: 'POA',
    id: '000C',
    limit: 0,
  },
  ETHEREUM_XDAI_FULL: {
    ticker: 'POA',
    id: '0027',
    limit: 0,
  },
  FUSE_FULL: {
    ticker: 'FUSE',
    id: '0005',
    limit: 0,
  },
  HARMONY: {
    ticker: 'HMY',
    id: '0040',
    limit: 0,
  },
  IOTEX_MAINNET: {
    ticker: 'IOT',
    id: '0044',
    limit: 0,
  },
  POCKET_MAINNET: {
    ticker: 'POKT',
    id: '0001',
    limit: 0,
  },
  POLYGON_ARCHIVAL: {
    ticker: 'POLY-A',
    id: '000B',
    limit: 0,
  },
  POLYGON_MAINNET: {
    ticker: 'POLY',
    id: '0009',
    limit: 0,
  },
  SOLANA_MAINNET: {
    ticker: 'SOL',
    id: '0006',
    limit: 0,
  },
  EVMOS_TESTNET: {
    ticker: 'EVMOS',
    id: '0046',
    limit: 10,
  },
}

function getChainsByEnvironment() {
  if (!env('PROD')) {
    return { ...TEST_CHAINS, ...TEST_ONLY_CHAINS }
  }

  if (env('PROD')) {
    return {
      ...MAIN_CHAINS,
    }
  }
}

export const FREE_TIER_STAKE_AMOUNT = 3120000000n
export const SLOT_STAKE_AMOUNT = 1000000n
export const chains = getChainsByEnvironment()

/**
 * Holds the workers configuration.
 */
export const workers = [
  {
    name: 'APP_PER_CHAIN_COUNTER',
    color: 'green',
    workerFn: (ctx): Promise<void> => getAppsPerChain(ctx),
    recurrence: SIXTY_MINUTES,
  },
  {
    name: 'APP_POOL_FILLER',
    color: 'green',
    workerFn: (ctx): Promise<void> => fillAppPool(ctx),
    recurrence: ONE_MINUTES,
  },
  {
    name: 'APP_POOL_STAKER',
    color: 'green',
    workerFn: (ctx): Promise<void> => stakeAppPool(ctx),
    recurrence: FIVE_MINUTES,
  },
  {
    name: 'APP_REMOVAL_CATEGORIZER',
    color: 'pink',
    workerFn: (ctx): Promise<void> => categorizeAppRemoval(ctx),
    recurrence: FIVE_MINUTES,
  },
  {
    name: 'APP_RESTAKING_FUNDS_SERVICE',
    color: 'red',
    workerFn: (ctx): Promise<void> => transferSlotFunds(ctx),
    recurrence: FIVE_MINUTES,
  },
  {
    name: 'APP_UNUSED_UNSTAKER_SERVICE',
    color: 'yellow',
    workerFn: (ctx): Promise<void> => unstakeApps(ctx),
    recurrence: FIVE_MINUTES,
  },
  {
    name: 'APP_SLOT_RESTAKER_SERVICE',
    color: 'brown',
    workerFn: (ctx): Promise<void> => stakeAppsForSlots(ctx),
    recurrence: FIVE_MINUTES,
  },
  {
    name: 'APP_FUND_REMOVAL_SERVICE',
    color: 'blue',
    workerFn: (ctx): Promise<void> => removeFundsFromApps(ctx),
    recurrence: FIVE_MINUTES,
  },
  {
    name: 'NOTIFICATION_WORKER',
    color: 'red',
    workerFn: (ctx): Promise<void> => notifyUsage(ctx),
    recurrence: SIXTY_MINUTES_OFFSET,
  },
  {
    name: 'LB_UNSTAKER',
    color: 'red',
    workerFn: (ctx): Promise<void> => unstakeLBs(ctx),
    recurrence: SIXTY_MINUTES_OFFSET,
  },
]
