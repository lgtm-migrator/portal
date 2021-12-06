const CHAIN_ID_PREFIXES = new Map([
  ['0001', { prefix: 'mainnet', name: 'Pocket Mainnet' }],
  ['0002', { prefix: 'btc-mainnet', name: 'Bitcoin Mainnet' }],
  ['0003', { prefix: 'avax-mainnet', name: 'Avalanche Mainnet' }],
  ['0004', { prefix: 'bsc-mainnet', name: 'Binance Smart Chain Mainnet' }],
  ['0005', { prefix: 'fuse-mainnet', name: 'Fuse Mainnet' }],
  ['0006', { prefix: 'solana-mainnet', name: 'Solana Mainnet' }],
  ['0009', { prefix: 'poly-mainnet', name: 'Polygon (Matic) Mainnet' }],
  ['000B', { prefix: 'poly-archival', name: 'Polygon (Matic) Archival' }],
  ['000C', { prefix: 'poa-xdai-archival', name: 'XDAI Mainnet (Archival)' }],
  ['000D', { prefix: 'algo-archival', name: 'Algorand Mainnet (Archival)' }],
  ['00A3', { prefix: 'avax-archival', name: 'Avalanche Mainnet (Archival)' }],
  ['0021', { prefix: 'eth-mainnet', name: 'Ethereum Mainnet' }],
  ['0022', { prefix: 'eth-archival', name: 'Ethereum Mainnet (Archival)' }],
  ['0023', { prefix: 'eth-ropsten', name: 'Ethereum Ropsten' }],
  ['0024', { prefix: 'poa-kovan', name: 'Kovan' }],
  ['0025', { prefix: 'eth-rinkeby', name: 'Ethereum Rinkeby' }],
  ['0026', { prefix: 'eth-goerli', name: 'Ethereum Goerli' }],
  ['0027', { prefix: 'poa-xdai', name: 'XDAI Mainnet' }],
  ['0028', { prefix: 'eth-trace', name: 'Ethereum Mainnet (Trace)' }],
  ['0029', { prefix: 'algo-mainnet', name: 'Algorand Mainnet' }],
  ['0040', { prefix: 'harmony-0', name: 'Harmony Shard 0' }],
  ['0044', { prefix: 'iotex-mainnet', name: 'IoTeX Mainnet' }],
  ['0046', { prefix: 'evmos-testnet', name: 'Evmos Testnet' }],
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
]
export const ALPHA_CHAINS = []

export function prefixFromChainId(chainId) {
  return CHAIN_ID_PREFIXES.get(chainId)
}

export function getServiceLevelByChain(chainId) {
  if (PRODUCTION_CHAINS.includes(chainId)) {
    return 'Production'
  } else if (ALPHA_CHAINS.includes(chainId)) {
    return 'Alpha'
  }
  return 'Beta'
}

export function getPriorityLevelByChain(chainId) {
  if (PRODUCTION_CHAINS.includes(chainId)) {
    return 0
  } else if (ALPHA_CHAINS.includes(chainId)) {
    return 2
  }
  return 1
}

export function processChains(chains) {
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
