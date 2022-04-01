import React, { useMemo, useState } from 'react'
import flagsData from '../utils/flags'

const DEFAULT_FLAGS_STATE = {}

const FlagContext = React.createContext(DEFAULT_FLAGS_STATE)

export function useFlags() {
  const context = useContext(FlagContext)

  if (!context) {
    throw new Error('Flags cannot be used without declaring the provider')
  }

  return context
}

const FlagContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [flags, setFlags] = useState({
    flags: flagsData,
  })

  const updateFlag = (key: string, value: unknown) => {
    setFlags((prevState) => ({
      ...prevState,
      [key]: value,
    }))
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
