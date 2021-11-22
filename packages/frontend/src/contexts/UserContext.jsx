import React, { useContext, useMemo } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'
import env from '../environment'
import { KNOWN_QUERY_SUFFIXES } from '../known-query-suffixes'

const DEFAULT_USER_STATE = {
  userLoading: true,
  email: '',
  id: '',
}

const UserContext = React.createContext(DEFAULT_USER_STATE)

export function useUser() {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('useUser cannot be used without declaring the provider')
  }

  return context
}

function useUserData() {
  const { data, isLoading, isError } = useQuery(
    [KNOWN_QUERY_SUFFIXES.USER_CONTEXT],
    async function getUserContext() {
      const path = `${env('BACKEND_URL')}/api/users/user`

      const { data } = await axios.get(path, {
        withCredentials: true,
      })

      return data
    }
  )

  return {
    data,
    isLoading,
    isError,
  }
}

export function UserContextProvider({ children }) {
  const { data, isLoading } = useUserData()

  const userData = useMemo(() => {
    if (isLoading) {
      return {
        email: '',
        id: '',
        userLoading: true,
      }
    }

    return {
      ...data,
      userLoading: false,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), isLoading])

  return (
    <UserContext.Provider value={userData}>{children}</UserContext.Provider>
  )
}
