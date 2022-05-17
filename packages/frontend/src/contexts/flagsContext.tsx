import { createContext, useMemo, useState, useContext } from 'react'
import flagsData, { FlagsData } from '../utils/flags'

const DEFAULT_FLAGS_STATE = {
  flags: { useAuth0: false, authHeaders: { headers: { Authorization: '' } } },
  updateFlag: () => undefined,
}

const FlagContext = createContext<{ flags: FlagsData }>(DEFAULT_FLAGS_STATE)

export function useFlags() {
  const context = useContext(FlagContext)

  if (!context) {
    throw new Error('Flags cannot be used without declaring the provider')
  }

  return context
}

const FlagContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [flags, setFlags] = useState(flagsData)

  const memoState = useMemo(() => {
    const updateFlag = (
      key: string | { [key: string]: string },
      value: string | undefined
    ) => {
      if (typeof key === 'object') {
        setFlags((prevState) => ({ ...prevState, ...key }))
      } else {
        setFlags((prevState) => ({ ...prevState, [key]: value }))
      }
    }

    return { flags, updateFlag }
  }, [flags])

  return (
    <FlagContext.Provider value={memoState}>{children}</FlagContext.Provider>
  )
}

export { FlagContext, FlagContextProvider }
