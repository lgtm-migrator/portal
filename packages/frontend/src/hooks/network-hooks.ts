import { useContext } from 'react'
import axios from 'axios'
import { useQuery } from 'react-query'
import env from '../environment'
import { useUser } from '../contexts/UserContext'
import { processChains, Chain } from '../lib/chain-utils'
import { FlagContext } from '../contexts/flagsContext'

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
  const { flags: { flags } = {} } = useContext(FlagContext)
  const { userLoading } = useUser()

  const {
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    data: summaryData,
  } = useQuery(
    '/network/summary',
    async function getNetworkSummary() {
      const path = `${env('BACKEND_URL')}/api/network/summary`

      try {
        const { data } = await axios.get(path, flags.authHeaders)

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
  const { flags: { flags } = {} } = useContext(FlagContext)
  const { userLoading } = useUser()
  const {
    isLoading: isChainsLoading,
    isError: isChainsError,
    data: chains,
  } = useQuery(
    '/network/chains',
    async function getNetworkChains() {
      const path = `${env('BACKEND_URL')}/api/network/${
        env('PROD') ? 'stakeable-' : ''
      }chains`

      try {
        const res = await axios.get(path, flags.authHeaders)

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
  const { flags: { flags } = {} } = useContext(FlagContext)
  const { userLoading } = useUser()

  const {
    isLoading: isRelaysLoading,
    isError: isRelaysError,
    data: relayData,
  } = useQuery(
    'network/weekly-relays',
    async function getWeeklyRelays() {
      try {
        const path = `${env('BACKEND_URL')}/api/network/daily-relays`
        const { data } = await axios.get(path, flags.authHeaders)

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
  const { flags: { flags } = {} } = useContext(FlagContext)
  const { userLoading } = useUser()

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
        } = await axios.get(path, flags.authHeaders)

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
        const { data } = await axios.get(path, {
          withCredentials: true,
        })

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
