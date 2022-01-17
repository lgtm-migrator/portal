import axios from 'axios'
import { useQuery } from 'react-query'
import { UserLB, UserLBOriginBucket } from '@pokt-foundation/portal-types'
import * as Sentry from '@sentry/react'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
import { sentryEnabled } from '../sentry'

export function useUserApplications(): {
  appsData: UserLB[] | undefined
  isAppsError: boolean
  isAppsLoading: boolean
  refetchUserApps: unknown
} {
  const {
    isLoading: isAppsLoading,
    isError: isAppsError,
    data: appsData,
    refetch: refetchUserApps,
  } = useQuery(
    KNOWN_QUERY_SUFFIXES.USER_APPS,
    async function getUserApplications() {
      const lbPath = `${env('BACKEND_URL')}/api/lb`

      try {
        const { data: lbData } = await axios.get(lbPath, {
          withCredentials: true,
        })

        const userLbs = lbData.map(({ ...rest }) => ({
          isLb: true,
          ...rest,
        })) as UserLB[]

        return [...userLbs]
      } catch (err) {
        if (sentryEnabled) {
          Sentry.configureScope((scope) => {
            scope.setTransactionName(`QUERY ${KNOWN_QUERY_SUFFIXES.USER_APPS}`)
          })
          Sentry.captureException(err)
        }
        throw err
      }
    }
  )

  return {
    appsData,
    isAppsError,
    isAppsLoading,
    refetchUserApps,
  }
}

export function useOriginClassification({ id }: { id: string }): {
  isLoading: boolean
  isError: boolean
  originData: UserLBOriginBucket[] | undefined
} {
  const {
    isLoading,
    isError,
    data: originData,
  } = useQuery(
    [KNOWN_QUERY_SUFFIXES.ORIGIN_CLASSIFICATION, id],
    async function getOriginClassification() {
      if (!id) {
        return []
      }
      const path = `${env('BACKEND_URL')}/api/lb/origin-classification/${id}`

      try {
        const { data } = await axios.get(path, {
          withCredentials: true,
        })

        return data.origin_classification as UserLBOriginBucket[]
      } catch (err) {
        if (sentryEnabled) {
          Sentry.configureScope((scope) => {
            scope.setTransactionName(
              `QUERY ${KNOWN_QUERY_SUFFIXES.ORIGIN_CLASSIFICATION}`
            )
          })
          Sentry.captureException(err)
        }
        throw err
      }
    },
    {
      keepPreviousData: true,
    }
  )

  return {
    isLoading,
    isError,
    originData,
  }
}
