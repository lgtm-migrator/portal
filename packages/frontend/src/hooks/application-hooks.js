import axios from 'axios'
import { useQuery } from 'react-query'
import * as Sentry from '@sentry/react'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
import { sentryEnabled } from '../sentry'

const PER_PAGE = 10

export function useUserApplications() {
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
        }))

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

export function useOriginClassification({ id }) {
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

        return data.origin_classification
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

export function useLatestRelays({
  id = '',
  page = 0,
  limit = 10,
  isLb = true,
}) {
  const {
    isLoading,
    isError,
    data: latestRelayData,
  } = useQuery(
    [KNOWN_QUERY_SUFFIXES.LATEST_RELAYS, id, isLb, limit, page],
    async function getLatestRelays() {
      if (!id) {
        return []
      }
      const path = `${env('BACKEND_URL')}/api/${
        isLb ? 'lb' : 'applications'
      }/latest-relays`

      try {
        const { data } = await axios.post(
          path,
          {
            id,
            limit,
            offset: page * PER_PAGE,
          },
          {
            withCredentials: true,
          }
        )

        return data.session_relays
      } catch (err) {
        if (sentryEnabled) {
          Sentry.configureScope((scope) => {
            scope.setTransactionName(
              `QUERY ${KNOWN_QUERY_SUFFIXES.LATEST_RELAYS}`
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
    latestRelayData,
  }
}
