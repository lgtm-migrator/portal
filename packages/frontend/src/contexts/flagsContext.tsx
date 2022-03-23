import React, { useState } from 'react'

const FlagContext = React.createContext({})

const FlagContextProvider = ({ 
    children 
        }: {
    children: React.ReactNode
    }) => {
  const [hookState, setHookState] = useState({
    authHeaders: 
        sessionStorage.getItem('useAuth0') === 'true' ? 
            {headers: {Authorization: `Bearer ${sessionStorage.getItem('AuthToken')}`}} :
            {withCredentials: true},
    useAuth0: sessionStorage.getItem('useAuth0') === 'true',
    flags: true
}) 

const updateHookState = (key: string, value: string) => {
  setHookState(prevState => ({
    ...prevState,
    [key]: value
  }))
}

return (
  <FlagContext.Provider value={{ hookState, updateHookState }}>
    {children}
  </FlagContext.Provider>
)
}

export { FlagContext, FlagContextProvider }