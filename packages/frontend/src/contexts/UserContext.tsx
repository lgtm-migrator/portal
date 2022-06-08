import React, { useContext, useMemo } from 'react'
import { useQuery } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'
import { FlagContext } from '../contexts/flagsContext'
import { useAuth0 } from '@auth0/auth0-react'

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

function useUserData() {
  const { flags } = useContext(FlagContext)

  const { data, isLoading, isError } = useQuery(
    [KNOWN_QUERY_SUFFIXES.USER_CONTEXT],
    async function getUserContext() {
      if (flags.useAuth0) {
        return { email: '', id: '' }
      } else {
        const path = `${env('BACKEND_URL')}/api/users/user`

        const { data } = await axios.get<{
          email: string | undefined
          id: string | undefined
        }>(path, flags.authHeaders)

        return data
      }
    }
  )

  return {
    data,
    isLoading,
    isError,
  }
}

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { flags } = useContext(FlagContext)

  const auth0UserData = useAuth0()
  const oldUserData = useUserData()

  const { data, isLoading } = flags.useAuth0
    ? { data: auth0UserData.user, isLoading: auth0UserData.isLoading }
    : oldUserData

  const userData = useMemo(() => {
    if (isLoading) {
      return {
        email: '',
        id: '',
        sub: '',
        userLoading: true,
      } as UserInfo
    }

    if (data && env('PROD')) {
      if (flags.useAuth0) {
        amplitude.getInstance().setUserId(data?.sub?.replace(/auth0\|/, ''))
      } else {
        amplitude.getInstance().setUserId(data.id)
      }
      const identifiedUser = new amplitude.Identify().set('email', data.email)

      amplitude.getInstance().identify(identifiedUser)
    }

    return {
      ...data,
      userLoading: false,
    } as UserInfo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), isLoading])

  return (
    <UserContext.Provider value={userData}>{children}</UserContext.Provider>
  )
}
