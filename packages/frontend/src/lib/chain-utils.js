const CHAIN_ID_PREFIXES = new Map([
  ['0001', { prefix: 'mainnet', name: 'Pocket Mainnet' }],
  ['0002', { prefix: 'btc-mainnet', name: 'Bitcoin Mainnet' }],
  ['0003', { prefix: 'avax-mainnet', name: 'Avalanche Mainnet' }],
  ['0004', { prefix: 'bsc-mainnet', name: 'Binance Smart Chain Mainnet' }],
  ['0005', { prefix: 'fuse-mainnet', name: 'Fuse Mainnet' }],
  ['0006', { prefix: 'solana-mainnet', name: 'Solana Mainnet' }],
  ['000B', { prefix: 'poly-archival', name: 'Polygon (Matic) Archival' }],
  ['0009', { prefix: 'poly-mainnet', name: 'Polygon (Matic) Mainnet' }],
  ['0010', { prefix: 'bsc-archival', name: 'Binance Smart Chain (Archival)' }],
  ['0021', { prefix: 'eth-mainnet', name: 'Ethereum Mainnet' }],
  ['0022', { prefix: 'eth-archival', name: 'Ethereum Mainnet (Archival)' }],
  ['0023', { prefix: 'eth-ropsten', name: 'Ethereum Ropsten' }],
  ['0024', { prefix: 'poa-kovan', name: 'Kovan' }],
  ['0025', { prefix: 'eth-rinkeby', name: 'Ethereum Rinkeby' }],
  ['0026', { prefix: 'eth-goerli', name: 'Ethereum Goerli' }],
  ['0027', { prefix: 'poa-xdai', name: 'XDAI Mainnet' }],
  ['0028', { prefix: 'eth-trace', name: 'Ethereum Mainnet (Trace)' }],
])

export const PRODUCTION_CHAINS = ['0001', '0005', '0021', '0022', '0028']
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
