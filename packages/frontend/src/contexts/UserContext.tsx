import React, { useContext, useMemo } from 'react'
import amplitude from 'amplitude-js'
import env from '../environment'
import { useAuth0 } from '@auth0/auth0-react'
import { splitAuth0ID } from '../lib/split-auth0-id'

type UserInfo = {
  userLoading: boolean
  email: string | undefined
  id: string | undefined
}

const DEFAULT_USER_STATE = {
  userLoading: true,
  email: '',
  id: '',
}

const UserContext = React.createContext<UserInfo>(DEFAULT_USER_STATE)

export function useUser(): UserInfo {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('useUser cannot be used without declaring the provider')
  }

  return context
}

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAuthenticated, isLoading } = useAuth0()

  const userData = useMemo(() => {
    if (isLoading) {
      return {
        email: '',
        id: '',
        sub: '',
        userLoading: true,
      } as UserInfo
    }

    if (isAuthenticated && user?.sub && user?.email && env('PROD')) {
      const userId = splitAuth0ID(user.sub)

      amplitude.getInstance().setUserId(userId)
      const identifiedUser = new amplitude.Identify().set('email', user.email)

      amplitude.getInstance().identify(identifiedUser)
    }

    return {
      ...user,
      userLoading: false,
    } as UserInfo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(user), isLoading])

  return (
    <UserContext.Provider value={userData}>{children}</UserContext.Provider>
  )
}
