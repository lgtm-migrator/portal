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
import { useUser } from '../contexts/UserContext'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
import { useAuthHeaders } from './useAuthHeaders'

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
  const { userLoading } = useUser()
  const { id: appId = '' } = activeApplication
  const useHeaders = useAuthHeaders()

  const { data, isLoading } = useQuery(
    `${KNOWN_QUERY_SUFFIXES.METRICS}-${appId}`,
    async function getMetrics() {
      const totalRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/lb/total-relays/${appId}`
      const successfulRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/lb/successful-relays/${appId}`
      const dailyRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/lb/daily-relays/${appId}`
      const sessionRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/lb/session-relays/${appId}`
      const previousSuccessfulRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/lb/previous-successful-relays/${appId}`
      const previousTotalRelaysPath = `${env(
        'BACKEND_URL'
      )}/api/lb/previous-total-relays/${appId}`
      const hourlyLatencyPath = `${env(
        'BACKEND_URL'
      )}/api/lb/hourly-latency/${appId}`
      const onChainDataPath = `${env('BACKEND_URL')}/api/lb/status/${appId}`

      const headers = await useHeaders

      try {
        const { data: totalRelaysResponse } = await axios.get(
          totalRelaysPath,
          headers
        )
        const { data: successfulRelaysResponse } = await axios.get(
          successfulRelaysPath,
          headers
        )

        const { data: dailyRelaysResponse } = await axios.get(
          dailyRelaysPath,
          headers
        )

        const { data: sessionRelaysResponse } = await axios.get(
          sessionRelaysPath,
          headers
        )

        const { data: previousSuccessfulRelaysResponse } = await axios.get(
          previousSuccessfulRelaysPath,
          headers
        )

        const { data: previousTotalRelaysResponse } = await axios.get(
          previousTotalRelaysPath,
          headers
        )

        const { data: hourlyLatencyResponse } = await axios.get(
          hourlyLatencyPath,
          headers
        )

        const { data: onChainDataResponse } = await axios.get(
          onChainDataPath,
          headers
        )

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
    },
    { enabled: !userLoading }
  )

  return { metricsLoading: isLoading, metrics: data || [] }
}
