import axios from 'axios'
import { useQueries } from 'react-query'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
import { log } from '../lib/utils'
import { ILBInfo } from './application-hooks'

export type TotalRelaysQuery = { total_relays: number }
export type SuccessfulRelaysQuery = TotalRelaysQuery
export type DailyRelaysQuery = {
  daily_relays: { dailyRelays: number; bucket: string }[]
}
export type PreviousRangedRelaysQuery = TotalRelaysQuery
export type PreviousSuccessfulRelaysQuery = { successful_relays: number }
export type SessionRelaysQuery = { session_relays: number }
export type HourlyLatencyQuery = {
  hourly_latency: { bucket: number; latency: number }[]
}
export type OnChainDataQuery = { stake: bigint; relays: number | bigint }

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useAppMetrics({
  activeApplication,
}: {
  activeApplication: ILBInfo
}) {
  const { id: appId = '', isLb = false } = activeApplication
  const type = isLb ? 'lb' : 'applications'

  const results = useQueries([
    {
      queryKey: [KNOWN_QUERY_SUFFIXES.WEEKLY_TOTAL_METRICS, type, appId],
      queryFn:
        async function getTotalWeeklyRelaysAndLatency(): Promise<TotalRelaysQuery> {
          log(type, appId)
          const path = `${env('BACKEND_URL')}/api/${type}/total-relays/${appId}`

          try {
            const { data } = await axios.get(path, {
              withCredentials: true,
            })

            return data
          } catch (err) {
            console.log(err)
          }
        },
    },
    {
      queryKey: [KNOWN_QUERY_SUFFIXES.WEEKLY_SUCCESSFUL_METRICS, type, appId],
      queryFn: async function getSuccessfulWeeklyRelaysAndLatency(): Promise<
        SuccessfulRelaysQuery | undefined
      > {
        const path = `${env(
          'BACKEND_URL'
        )}/api/${type}/successful-relays/${appId}`

        try {
          const { data } = await axios.get(path, {
            withCredentials: true,
          })

          return data
        } catch (err) {
          console.log(err)
        }
      },
    },
    {
      queryKey: [KNOWN_QUERY_SUFFIXES.DAILY_BREAKDOWN_METRICS, type, appId],
      queryFn: async function getDailyRelays(): Promise<
        DailyRelaysQuery | undefined
      > {
        const path = `${env('BACKEND_URL')}/api/${type}/daily-relays/${appId}`

        try {
          const { data } = await axios.get(path, {
            withCredentials: true,
          })

          return data
        } catch (err) {
          console.log(err)
        }
      },
    },
    {
      queryKey: [KNOWN_QUERY_SUFFIXES.SESSION_METRICS, type, appId],
      queryFn: async function getTotalSessionRelays(): Promise<
        SessionRelaysQuery | undefined
      > {
        const path = `${env('BACKEND_URL')}/api/${type}/session-relays/${appId}`

        try {
          const { data } = await axios.get(path, {
            withCredentials: true,
          })

          return data
        } catch (err) {
          console.log(err)
        }
      },
    },
    {
      queryKey: [KNOWN_QUERY_SUFFIXES.PREVIOUS_SUCCESSFUL_METRICS, type, appId],
      queryFn: async function getPreviousSuccessfulRelays(): Promise<
        PreviousSuccessfulRelaysQuery | undefined
      > {
        const path = `${env(
          'BACKEND_URL'
        )}/api/${type}/previous-successful-relays/${appId}`

        try {
          const { data } = await axios.get(path, {
            withCredentials: true,
          })

          return data
        } catch (err) {
          console.log(err)
        }
      },
    },
    {
      queryKey: [KNOWN_QUERY_SUFFIXES.PREVIOUS_TOTAL_METRICS, type, appId],
      queryFn: async function gePreviousRangedRelays(): Promise<
        PreviousRangedRelaysQuery | undefined
      > {
        const path = `${env('BACKEND_URL')}/api/${type}/ranged-relays/${appId}`

        try {
          const { data } = await axios.get(path, {
            withCredentials: true,
          })

          return data
        } catch (err) {
          console.log(err)
        }
      },
    },
    {
      queryKey: [KNOWN_QUERY_SUFFIXES.HOURLY_LATENCY_METRICS, type, appId],
      queryFn: async function getDailyHourlyLatency(): Promise<
        HourlyLatencyQuery | undefined
      > {
        const path = `${env('BACKEND_URL')}/api/${type}/hourly-latency/${appId}`

        try {
          const { data } = await axios.get(path, {
            withCredentials: true,
          })

          return data
        } catch (err) {
          console.log(err)
        }
      },
    },
    {
      queryKey: [KNOWN_QUERY_SUFFIXES.ONCHAIN_DATA, type, appId],
      queryFn: async function getAppOnChainData(): Promise<
        OnChainDataQuery | undefined
      > {
        const path = `${env('BACKEND_URL')}/api/${type}/status/${appId}`

        try {
          const { data } = await axios.get(path, {
            withCredentials: true,
          })

          log('onchaindata:', data)

          return data
        } catch (err) {
          console.log(err)
        }
      },
    },
  ])

  const metricsLoading = results.reduce(
    (loading, result) => result.isLoading || loading,
    false
  )

  return { metricsLoading, metrics: results }
}
