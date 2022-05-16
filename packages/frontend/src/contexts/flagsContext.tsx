import React, { useMemo, useState, useContext } from 'react'
import flagsData from '../utils/flags'

const DEFAULT_FLAGS_STATE = {
  flags: {
    useAuth0: false,
    authHeaders: {
      headers: {
        Authorization: '',
      },
    },
  },
  updateFlag: Function,
}

type FlagInfo = {
  flags: {
    useAuth0: boolean
    authHeaders: {
      headers:
        | {
            Authorization: string
          }
        | { withCredentials: boolean }
    }
  }
  updateFlag: (
    key: string | { [key: string]: any },
    value: string | undefined
  ) => void
}

const FlagContext = React.createContext<FlagInfo>(DEFAULT_FLAGS_STATE)

export function useFlags() {
  const context = useContext(FlagContext)

  if (!context) {
    throw new Error('Flags cannot be used without declaring the provider')
  }

  return context
}

const FlagContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [flags, setFlags] = useState(flagsData)

  const updateFlag = (
    key: string | { [key: string]: any },
    value: string | undefined
  ) => {
    if (typeof key === 'object') {
      setFlags((prevState) => ({
        ...prevState,
        ...key,
      }))
    } else {
      setFlags((prevState) => ({
        ...prevState,
        [key]: value,
      }))
    }
  }

  const memoState = useMemo(
    () => ({
      flags,
      updateFlag,
    }),
    [flags, updateFlag]
  )

  return (
    <FlagContext.Provider value={memoState}>{children}</FlagContext.Provider>
  )
}

export { FlagContext, FlagContextProvider }
