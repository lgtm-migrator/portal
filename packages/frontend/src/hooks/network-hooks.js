import axios from 'axios'
import { useQuery } from 'react-query'
import env from '../environment'
import { processChains } from '../lib/chain-utils'

export function useNetworkSummary() {
  const {
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    data: summaryData,
  } = useQuery('/network/summary', async function getNetworkSummary() {
    const path = `${env('BACKEND_URL')}/api/network/summary`

    try {
      const {
        data: { summary },
      } = await axios.get(path, {
        withCredentials: true,
      })

      return summary
    } catch (err) {
      console.log('?', err)
    }
  })

  return {
    isSummaryError,
    isSummaryLoading,
    summaryData,
  }
}

export function useChains() {
  const {
    isLoading: isChainsLoading,
    isError: isChainsError,
    data: chains,
  } = useQuery('/network/chains', async function getNetworkChains() {
    const path = `${env('BACKEND_URL')}/api/network/${
      env('PROD') ? 'stakeable-' : ''
    }chains`

    try {
      const res = await axios.get(path, {
        withCredentials: true,
      })

      const {
        data: { chains },
      } = res

      return processChains(chains)
    } catch (err) {
      console.log('?', err)
    }
  })

  return {
    isChainsError,
    isChainsLoading,
    chains,
  }
}

export function useTotalWeeklyRelays() {
  const {
    isLoading: isRelaysLoading,
    isError: isRelaysError,
    data: relayData,
  } = useQuery('network/weekly-relays', async function getWeeklyRelays() {
    try {
      const path = `${env('BACKEND_URL')}/api/network/daily-relays`
      const { data } = await axios.get(path, {
        withCredentials: true,
      })

      return data
    } catch (err) {
      console.log(err, 'rip')
    }
  })

  return {
    isRelaysError,
    isRelaysLoading,
    relayData,
  }
}

export function useNetworkStats() {
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
        } = await axios.get(path, {
          withCredentials: true,
        })

        return { successfulRelays, totalRelays }
      } catch (err) {
        console.log(err, 'rip')
      }
    }
  )

  return {
    isNetworkStatsLoading,
    isNetworkStatsError,
    networkStats,
  }
}
