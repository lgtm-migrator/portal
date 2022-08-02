import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import env from '../environment'

interface UseApiReturn {
  refresh: () => void
  error: null
  loading: boolean
  data: null
}

export const useApi = (url: string): UseApiReturn => {
  const { getAccessTokenSilently } = useAuth0()
  const [state, setState] = useState({
    error: null,
    loading: true,
    data: null,
  })
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    ;(async () => {
      const options = {
        audience: env('AUTH0_AUDIENCE'),
        scope: env('AUTH0_SCOPE'),
      }

      try {
        const { audience, scope, ...fetchOptions } = options
        const accessToken = await getAccessTokenSilently({ audience, scope })
        const res = await fetch(url, {
          ...fetchOptions,
          headers: {
            // Add the Authorization header to the existing headers
            Authorization: `Bearer ${accessToken}`,
          },
        })

        setState({
          ...state,
          data: await res.json(),
          error: null,
          loading: false,
        })
      } catch (error) {
        setState({
          ...state,
          loading: false,
        })
        console.log(error)
      }
    })()
  }, [refreshIndex, getAccessTokenSilently, state, url])

  return {
    ...state,
    refresh: () => setRefreshIndex(refreshIndex + 1),
  }
}
