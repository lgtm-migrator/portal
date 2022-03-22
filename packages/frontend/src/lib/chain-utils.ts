export type ChainMetadata = {
  prefix: string
  name: string
  abbrv: string
}

export type Chain = {
  id: string
  ticker: string
  network: string
  description: string
  appCount?: number
  isAvailableForStaking: boolean
}

export const CHAIN_ID_PREFIXES = new Map<string, ChainMetadata>([
  ['0001', { prefix: 'mainnet', name: 'Pocket Mainnet', abbrv: 'Mainnet' }],
  [
    '0003',
    { prefix: 'avax-mainnet', name: 'Avalanche Mainnet', abbrv: 'AVAX' },
  ],
  ['0005', { prefix: 'fuse-mainnet', name: 'Fuse Mainnet', abbrv: 'Fuse' }],
  [
    '0006',
    { prefix: 'solana-mainnet', name: 'Solana Mainnet', abbrv: 'Solana' },
  ],
  [
    '0009',
    {
      prefix: 'poly-mainnet',
      name: 'Polygon (Matic) Mainnet',
      abbrv: 'Polygon',
    },
  ],
  [
    '000B',
    {
      prefix: 'poly-archival',
      name: 'Polygon (Matic) Archival',
      abbrv: 'Polygon',
    },
  ],
  [
    '000C',
    {
      prefix: 'poa-xdai-archival',
      name: 'Gnosis Chain Mainnet (Archival)',
      abbrv: 'Gnosis',
    },
  ],
  [
    '000D',
    {
      prefix: 'algo-archival',
      name: 'Algorand Mainnet (Archival)',
      abbrv: 'Algorand',
    },
  ],
  [
    '00A3',
    {
      prefix: 'avax-archival',
      name: 'Avalanche Mainnet (Archival)',
      abbrv: 'AVAX',
    },
  ],
  ['0021', { prefix: 'eth-mainnet', name: 'Ethereum Mainnet', abbrv: 'ETH' }],
  [
    '0022',
    {
      prefix: 'eth-archival',
      name: 'Ethereum Mainnet (Archival)',
      abbrv: 'ETH',
    },
  ],
  ['0023', { prefix: 'eth-ropsten', name: 'Ethereum Ropsten', abbrv: 'ETH' }],
  ['0024', { prefix: 'poa-kovan', name: 'Kovan', abbrv: 'Kovan' }],
  ['0025', { prefix: 'eth-rinkeby', name: 'Ethereum Rinkeby', abbrv: 'ETH' }],
  ['0026', { prefix: 'eth-goerli', name: 'Ethereum Goerli', abbrv: 'ETH' }],
  [
    '0027',
    { prefix: 'poa-xdai', name: 'Gnosis Chain Mainnet', abbrv: 'Gnosis' },
  ],
  [
    '0028',
    { prefix: 'eth-trace', name: 'Ethereum Mainnet (Trace)', abbrv: 'ETH' },
  ],
  [
    '0029',
    { prefix: 'algo-mainnet', name: 'Algorand Mainnet', abbrv: 'Algorand' },
  ],
  ['0040', { prefix: 'harmony-0', name: 'Harmony Shard 0', abbrv: 'Harmony' }],
  ['0044', { prefix: 'iotex-mainnet', name: 'IoTeX Mainnet', abbrv: 'IoTeX' }],
  ['0046', { prefix: 'evmos-testnet', name: 'Evmos Testnet', abbrv: 'Evmos' }],
  ['0047', { prefix: 'oec-mainnet', name: 'OEC Mainnet', abbrv: 'OEC' }],
  ['0048', { prefix: 'boba-mainnet', name: 'BOBA Mainnet', abbrv: 'BOBA' }],
  ['0004', { prefix: 'bsc-mainnet', name: 'BSC Mainnet', abbrv: 'BSC' }],
])

export const PRODUCTION_CHAINS = [
  '0001',
  '0003',
  '0004',
  '0005',
  '0009',
  '000B',
  '000C',
  '0021',
  '0022',
  '0023',
  '0025',
  '0026',
  '0027',
  '0028',
  '0040',
  '0048',
  '0047',
]
export const ALPHA_CHAINS: string[] = []

export function prefixFromChainId(chainId: string): ChainMetadata | undefined {
  return CHAIN_ID_PREFIXES.get(chainId)
}

export function getServiceLevelByChain(
  chainId: string
): 'Production' | 'Alpha' | 'Beta' {
  if (PRODUCTION_CHAINS.includes(chainId)) {
    return 'Production'
  } else if (ALPHA_CHAINS.includes(chainId)) {
    return 'Alpha'
  }
  return 'Beta'
}

export function getPriorityLevelByChain(chainId: string): number {
  if (PRODUCTION_CHAINS.includes(chainId)) {
    return 0
  } else if (ALPHA_CHAINS.includes(chainId)) {
    return 2
  }
  return 1
}

export function processChains(chains: Chain[]): Chain[] {
  if (!chains.length) {
    return chains
  }
  return chains
    .sort((a, b) => {
      const chainA = a.description.toUpperCase()
      const chainB = b.description.toUpperCase()

      if (chainA < chainB) {
        return -1
      } else if (chainA > chainB) {
        return 1
      }
      return 0
    })
    .sort((a, b) => {
      const priorityA = getPriorityLevelByChain(a.id)
      const priorityB = getPriorityLevelByChain(b.id)

      return priorityA - priorityB
    })
}
