import axios from 'axios'
import { useQuery } from 'react-query'
import * as Sentry from '@sentry/react'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
import { sentryEnabled } from '../sentry'

export interface IGatewaySettings {
  secretKey: string
  secretKeyRequired: boolean
  whitelistOrigins: string[]
  whitelistUserAgents: string[]
}

export interface INotificationSettings {
  signedUp: boolean
  quarter: boolean
  quarterLastSent?: Date | number
  half: boolean
  halfLastSent?: Date | number
  threeQuarters: boolean
  threeQuartersLastSent?: Date | number
  full: boolean
  fullLastSent?: Date | number
  createdAt?: Date | number
}

export type IAppInfo = {
  address: string
  appId: string
  publicKey: string
}

export type ILBInfo = {
  apps: IAppInfo[]
  chain: string
  createdAt?: Date | number
  updatedAt?: Date | number
  freeTier: boolean
  gatewaySettings: IGatewaySettings
  name: string
  notificationSettings: INotificationSettings
  id: string
  status: string
  user?: string
  isLb?: boolean
}

export type OriginData = {
  origin: string
  count: number
}

export function useUserApplications(): {
  appsData: ILBInfo[] | undefined
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
        })) as ILBInfo[]

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
  originData: OriginData[] | undefined
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

        return data.origin_classification as OriginData[]
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
