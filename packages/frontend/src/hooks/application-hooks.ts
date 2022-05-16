import { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { useQuery } from 'react-query'
import { UserLB, UserLBOriginBucket } from '@pokt-foundation/portal-types'
import * as Sentry from '@sentry/react'
import { useUser } from '../contexts/UserContext'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
import { sentryEnabled } from '../sentry'
import { FlagContext } from '../contexts/flagsContext'

export function useUserApplications(): {
  appsData: UserLB[] | undefined
  isAppsError: boolean
  isAppsLoading: boolean
  refetchUserApps: unknown
} {
  const { flags } = useContext(FlagContext)
  const [loading, setLoading] = useState(true)
  const { userLoading } = useUser()

  useEffect(() => {
    if (flags.useAuth0) {
      if (flags?.authHeaders?.headers?.Authorization !== 'Bearer test') {
        setLoading(false)
      }
    } else {
      setLoading(userLoading)
    }
  }, [flags?.authHeaders?.headers?.Authorization, userLoading])

  const {
    isLoading: isAppsLoading,
    isError: isAppsError,
    data: appsData,
    refetch: refetchUserApps,
  } = useQuery(
    [KNOWN_QUERY_SUFFIXES.USER_APPS],
    async function getUserApplications() {
      if (loading) {
        return
      }

      let lbPath = `${env('BACKEND_URL')}/api/lb`

      if (flags.useAuth0) {
        lbPath = `${env('BACKEND_URL')}/api/v2/lb`
      }

      try {
        console.log('DEBUG', 'Attempting to fetch LBs using LB path: ', lbPath)
        const { data: lbData } = await axios.get(lbPath, flags.authHeaders)

        console.log('DEBUG', 'Successfully fetched LBs ', lbData)

        const userLbs = lbData.map(({ ...rest }) => ({
          isLb: true,
          ...rest,
        })) as UserLB[]

        return [...userLbs]
      } catch (err) {
        console.log('DEBUG', 'LB error:', error)
        if (sentryEnabled) {
          Sentry.configureScope((scope) => {
            scope.setTransactionName(`QUERY ${KNOWN_QUERY_SUFFIXES.USER_APPS}`)
          })
          Sentry.captureException(err)
        }
        throw err
      }
    },
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
  const { flags } = useContext(FlagContext)
  const { userLoading } = useUser()
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

      let path = `${env('BACKEND_URL')}/api/lb/origin-classification/${id}`

      if (flags.useAuth0) {
        path = `${env('BACKEND_URL')}/api/v2/lb/origin-classification/${id}`
      }

      try {
        const { data } = await axios.get(path, flags.authHeaders)

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
      enabled: !userLoading,
    }
  )

  return {
    isLoading,
    isError,
    originData,
  }
}
