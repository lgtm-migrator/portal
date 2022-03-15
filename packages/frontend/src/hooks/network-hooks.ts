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

export function useNetworkSummary(): {
  isSummaryLoading: boolean
  isSummaryError: boolean
  summaryData: SummaryData
} {
  const flagContext = useContext(FlagContext)
  const { userLoading } = useUser()

  const {
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    data: summaryData,
  } = useQuery('/network/summary', async function getNetworkSummary() {
    const path = `${env('BACKEND_URL')}/api/network/summary`

    try {
      const { data } = await axios.get(path, flagContext.hookState.authHeaders)

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
  const flagContext = useContext(FlagContext)
  const { userLoading } = useUser()
  const {
    isLoading: isChainsLoading,
    isError: isChainsError,
    data: chains,
  } = useQuery('/network/chains', async function getNetworkChains() {
    const path = `${env('BACKEND_URL')}/api/network/${
      env('PROD') ? 'stakeable-' : ''
    }chains`

    try {
      const res = await axios.get(path, flagContext.hookState.authHeaders)

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
  const flagContext = useContext(FlagContext)
  const { userLoading } = useUser()

  const {
    isLoading: isRelaysLoading,
    isError: isRelaysError,
    data: relayData,
  } = useQuery('network/weekly-relays', async function getWeeklyRelays() {
    try {
      const path = `${env('BACKEND_URL')}/api/network/daily-relays`
      const { data } = await axios.get(path, flagContext.hookState.authHeaders)

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
  const flagContext = useContext(FlagContext)
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
        } = await axios.get(path, flagContext.hookState.authHeaders)

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
