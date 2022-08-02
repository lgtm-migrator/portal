import axios from 'axios'
import { useQuery } from 'react-query'
import env from '../environment'
import { useUser } from '../contexts/UserContext'
import { processChains, Chain } from '../lib/chain-utils'
import { useAuthHeaders } from './useAuthHeaders'

export type SummaryData = {
  appsStaked: number
  nodesStaked: number
  poktStaked: number
}

export type DailyRelayBucket = {
  total_relays: number
  bucket: string
}

export type NetworkRelayStats = {
  successfulRelays: number
  totalRelays: number
}

export type PoktScanLatestBlockAndPerformanceData = {
  highestBlock: {
    validatorThreshold: number
    item: {
      height: number
      producer: string
      time: string
      took: number
      total_accounts: number
      total_apps: number
      total_nodes: number
      total_relays_completed: number
      total_txs: number
    }
  }
  getRelaysPerformance: {
    max_pokt: number
    max_relays: number
    thirty_day_pokt_avg: number
    thirty_day_relays_avg: number
    today_pokt: number
    today_relays: number
  }
}

export function useNetworkSummary(): {
  isSummaryLoading: boolean
  isSummaryError: boolean
  summaryData: SummaryData
} {
  const { userLoading } = useUser()
  const headers = useAuthHeaders()

  const {
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    data: summaryData,
  } = useQuery(
    '/network/summary',
    async function getNetworkSummary() {
      const path = `${env('BACKEND_URL')}/api/network/summary`

      try {
        const { data } = await axios.get(path, await headers)

        return data
      } catch (err) {
        console.log('?', err)
      }
    },
    { enabled: !userLoading }
  )

  return {
    isSummaryError,
    isSummaryLoading,
    summaryData,
  }
}

export function useChains(): {
  isChainsError: boolean
  isChainsLoading: boolean
  chains: Chain[] | undefined
} {
  const { userLoading } = useUser()
  const headers = useAuthHeaders()
  const {
    isLoading: isChainsLoading,
    isError: isChainsError,
    data: chains,
  } = useQuery(
    '/network/chains',
    async function getNetworkChains() {
      const path = `${env('BACKEND_URL')}/api/network/${
        env('PROD') ? 'usable-' : ''
      }chains`

      try {
        const res = await axios.get(path, await headers)

        const { data } = res

        return processChains(data) as Chain[]
      } catch (err) {}
    },
    {
      enabled: !userLoading,
    }
  )

  return {
    isChainsError,
    isChainsLoading,
    chains,
  }
}

export function useTotalWeeklyRelays(): {
  isRelaysError: boolean
  isRelaysLoading: boolean
  relayData: DailyRelayBucket[]
} {
  const { userLoading } = useUser()
  const headers = useAuthHeaders()

  const {
    isLoading: isRelaysLoading,
    isError: isRelaysError,
    data: relayData,
  } = useQuery(
    'network/weekly-relays',
    async function getWeeklyRelays() {
      try {
        const path = `${env('BACKEND_URL')}/api/network/daily-relays`
        const { data } = await axios.get(path, await headers)

        return data
      } catch (err) {}
    },
    { enabled: !userLoading }
  )

  return {
    isRelaysError,
    isRelaysLoading,
    relayData,
  }
}

export function useNetworkStats(): {
  isNetworkStatsLoading: boolean
  isNetworkStatsError: boolean
  networkStats: NetworkRelayStats | undefined
} {
  const { userLoading } = useUser()
  const headers = useAuthHeaders()

  const {
    isLoading: isNetworkStatsLoading,
    isError: isNetworkStatsError,
    data: networkStats,
  } = useQuery(
    'network/weekly-aggregate-stats',
    async function getWeeklyRelays() {
      const path = `${env('BACKEND_URL')}/api/network/weekly-aggregate-stats`

      try {
        const {
          data: {
            successful_relays: successfulRelays,
            total_relays: totalRelays,
          },
        } = await axios.get(path, await headers)

        return { successfulRelays, totalRelays }
      } catch (err) {
        console.log(err, 'rip')
      }
    },
    {
      enabled: !userLoading,
    }
  )

  return {
    isNetworkStatsLoading,
    isNetworkStatsError,
    networkStats,
  }
}

export function usePoktScanLatestBlockAndPerformance(): {
  isPoktScanLatestBlockAndPerformanceLoading: boolean
  isPoktScanLatestBlockAndPerformanceError: boolean
  latestBlockAndPerformance: PoktScanLatestBlockAndPerformanceData
} {
  const headers = useAuthHeaders()

  const {
    data: latestBlockAndPerformance,
    isLoading: isPoktScanLatestBlockAndPerformanceLoading,
    isError: isPoktScanLatestBlockAndPerformanceError,
  } = useQuery(
    'network/latest-block-and-performance',
    async function getPoktScanLatestBlockAndPerformance() {
      const path = `${env(
        'BACKEND_URL'
      )}/api/network/latest-block-and-performance`

      try {
        const { data } = await axios.get(path, await headers)

        return data?.data
      } catch (err) {
        console.log()
      }
    }
  )

  return {
    latestBlockAndPerformance,
    isPoktScanLatestBlockAndPerformanceError,
    isPoktScanLatestBlockAndPerformanceLoading,
  }
}
