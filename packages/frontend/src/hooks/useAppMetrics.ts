/* eslint-disable prettier/prettier */
import axios from 'axios'
import { useQuery } from 'react-query'
import {
  UserLB,
  UserLBDailyRelaysResponse,
  UserLBHistoricalLatencyResponse,
  UserLBOnChainDataResponse,
  UserLBPreviousTotalRelaysResponse,
  UserLBPreviousTotalSuccessfulRelaysResponse,
  UserLBSessionRelaysResponse,
  UserLBTotalRelaysResponse,
  UserLBTotalSuccessfulRelaysResponse,
} from '@pokt-foundation/portal-types'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'

export function useAppMetrics({
  activeApplication,
}: {
  activeApplication: UserLB
}): {
  metricsLoading: boolean
  metrics:
    | [
        UserLBTotalRelaysResponse,
        UserLBTotalSuccessfulRelaysResponse,
        UserLBDailyRelaysResponse,
        UserLBSessionRelaysResponse,
        UserLBPreviousTotalSuccessfulRelaysResponse,
        UserLBPreviousTotalRelaysResponse,
        UserLBHistoricalLatencyResponse,
        UserLBOnChainDataResponse
      ]
    | []
} {
  const { id: appId = '' } = activeApplication
  const type = 'lb'

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
      )}/api/${type}/previous-total-relays/${appId}`
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
          totalRelaysResponse as UserLBTotalRelaysResponse,
          successfulRelaysResponse as UserLBTotalSuccessfulRelaysResponse,
          dailyRelaysResponse as UserLBDailyRelaysResponse,
          sessionRelaysResponse as UserLBSessionRelaysResponse,
          previousSuccessfulRelaysResponse as UserLBPreviousTotalSuccessfulRelaysResponse,
          previousTotalRelaysResponse as UserLBPreviousTotalRelaysResponse,
          hourlyLatencyResponse as UserLBHistoricalLatencyResponse,
          onChainDataResponse as UserLBOnChainDataResponse,
        ]
      } catch (err) {
        console.log(err)
      }
    }
  )

  return { metricsLoading: isLoading, metrics: data || [] }
}
