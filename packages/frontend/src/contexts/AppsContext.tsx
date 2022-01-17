import React, { useCallback, useContext, useMemo } from 'react'
import { UserLB } from '@pokt-foundation/portal-types'
import { useUserApplications } from '../hooks/application-hooks'
import { log } from '../lib/utils'

type UserAppInfo = {
  appsLoading: boolean
  userApps: UserLB[]
  refetchApps: () => void
}
const DEFAULT_APP_STATE = {
  appsLoading: true,
  userApps: [],
  refetchApps: () => {},
}

const AppsContext = React.createContext<UserAppInfo>(DEFAULT_APP_STATE)

export function useUserApps(): UserAppInfo {
  const context = useContext(AppsContext)

  if (!context) {
    throw new Error(
      'useUserApps cannot be used without declaring the provider.'
    )
  }

  return context
}

export function AppsContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    isAppsLoading,
    appsData = [],
    refetchUserApps,
  } = useUserApplications()

  const appsLoading = isAppsLoading

  const refetchApps = useCallback(async () => {
    await refetchUserApps()
  }, [refetchUserApps])

  const userApps = useMemo(() => {
    if (appsLoading) {
      return DEFAULT_APP_STATE
    }

    const appWithUser = appsData.find((app) => app.user)

    const userID = appWithUser?.user ?? ''

    return { appsLoading, userApps: appsData, refetchApps, userID }
  }, [appsData, appsLoading, refetchApps])

  log('USER APPS:', userApps)

  return (
    <AppsContext.Provider value={userApps}>{children}</AppsContext.Provider>
  )
}
