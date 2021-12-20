import axios from 'axios'
import { useQuery } from 'react-query'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
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
}): {
  metricsLoading: boolean
  metrics:
    | [
        TotalRelaysQuery,
        SuccessfulRelaysQuery,
        DailyRelaysQuery,
        SessionRelaysQuery,
        PreviousSuccessfulRelaysQuery,
        PreviousRangedRelaysQuery,
        HourlyLatencyQuery,
        OnChainDataQuery
      ]
    | []
} {
  const { id: appId = '', isLb = false } = activeApplication
  const type = isLb ? 'lb' : 'applications'

  const { data, isLoading } = useQuery(
    `${KNOWN_QUERY_SUFFIXES.METRICS}-${appId}`,
    async function getMetrics() {
      const totalRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/${type}/total-relays/${appId}`
      const successfulRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/${type}/successful-relays/${appId}`
      const dailyRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/${type}/daily-relays/${appId}`
      const sessionRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/${type}/session-relays/${appId}`
      const previousSuccessfulRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/${type}/previous-successful-relays/${appId}`
      const previousTotalRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/${type}/ranged-relays/${appId}`
      const hourlyLatencyPath = `${env(
        'BACKEND_URL'
      )}/api/${type}/hourly-latency/${appId}`
      const onChainDataPath = `${env(
        'BACKEND_URL'
      )}/api/${type}/status/${appId}`

      try {
        const { data: totalRelaysResponse } = await axios.get(totalRelaysPath, {
          withCredentials: true,
        })
        const { data: successfulRelaysResponse } = await axios.get(
          successfulRelaysPath,
          {
            withCredentials: true,
          }
        )
        const { data: dailyRelaysResponse } = await axios.get(dailyRelaysPath, {
          withCredentials: true,
        })
        const { data: sessionRelaysResponse } = await axios.get(
          sessionRelaysPath,
          {
            withCredentials: true,
          }
        )
        const { data: previousSuccessfulRelaysResponse } = await axios.get(
          previousSuccessfulRelaysPath,
          {
            withCredentials: true,
          }
        )
        const { data: previousTotalRelaysResponse } = await axios.get(
          previousTotalRelaysPath,
          {
            withCredentials: true,
          }
        )
        const { data: hourlyLatencyResponse } = await axios.get(
          hourlyLatencyPath,
          {
            withCredentials: true,
          }
        )
        const { data: onChainDataResponse } = await axios.get(onChainDataPath, {
          withCredentials: true,
        })

        return [
          totalRelaysResponse as TotalRelaysQuery,
          successfulRelaysResponse as SuccessfulRelaysQuery,
          dailyRelaysResponse as DailyRelaysQuery,
          sessionRelaysResponse as SessionRelaysQuery,
          previousSuccessfulRelaysResponse as PreviousSuccessfulRelaysQuery,
          previousTotalRelaysResponse as PreviousRangedRelaysQuery,
          hourlyLatencyResponse as HourlyLatencyQuery,
          onChainDataResponse as OnChainDataQuery,
        ]
      } catch (err) {
        console.log(err)
      }
    }
  )

  return { metricsLoading: isLoading, metrics: data || [] }
}
