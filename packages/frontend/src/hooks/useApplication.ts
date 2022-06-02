import { useEffect, useState } from 'react'
import axios from 'axios'
import { useQuery } from 'react-query'
import { UserLB, UserLBOriginBucket } from '@pokt-foundation/portal-types'
import * as Sentry from '@sentry/react'
import { useUser } from '../contexts/UserContext'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
import { sentryEnabled } from '../sentry'
import { useAuthHeaders } from './useAuthHeaders'

export function useUserApplications(): {
  appsData: UserLB[] | undefined
  isAppsError: boolean
  isAppsLoading: boolean
  refetchUserApps: unknown
} {
  const [loading, setLoading] = useState(true)
  const { userLoading } = useUser()
  const headers = useAuthHeaders()
  const path = `${env('BACKEND_URL')}/api/lb`

  useEffect(() => {
    setLoading(userLoading)
  }, [userLoading])

  const {
    isLoading: isAppsLoading,
    isError: isAppsError,
    data: appsData,
    refetch: refetchUserApps,
  } = useQuery(
    [KNOWN_QUERY_SUFFIXES.USER_APPS],
    async () =>
      await axios
        .get(path, await headers)
        .then(({ data }) => {
          const userLbs = data.map(({ ...rest }) => ({
            isLb: true,
            ...rest,
          })) as UserLB[]

          return [...userLbs]
        })
        .catch((err) => {
          console.debug('DEBUG', 'LB error:', err)

          if (sentryEnabled) {
            Sentry.configureScope((scope) => {
              scope.setTransactionName(
                `QUERY ${KNOWN_QUERY_SUFFIXES.USER_APPS}`
              )
            })
            Sentry.captureException(err)
          }
          throw err
        }),
    {
      enabled: !loading,
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
  const { userLoading } = useUser()
  const headers = useAuthHeaders()

  const path = `${env('BACKEND_URL')}/api/lb/origin-classification/${id}`

  const {
    isLoading,
    isError,
    data: originData,
  } = useQuery(
    [KNOWN_QUERY_SUFFIXES.ORIGIN_CLASSIFICATION, id],
    async () =>
      await axios
        .get(path, await headers)
        .then(({ data }) => {
          return data.origin_classification as UserLBOriginBucket[]
        })
        .catch((err) => {
          console.debug('DEBUG', 'LB error:', err)

          if (sentryEnabled) {
            Sentry.configureScope((scope) => {
              scope.setTransactionName(
                `QUERY ${KNOWN_QUERY_SUFFIXES.ORIGIN_CLASSIFICATION}`
              )
            })
            Sentry.captureException(err)
          }
          throw err
        }),
    {
      keepPreviousData: true,
      enabled: !userLoading,
    }
  )

  return {
    isLoading,
    isError,
    originData,
  }
}
