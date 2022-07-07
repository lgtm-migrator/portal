import { useAuth0 } from '@auth0/auth0-react'
import env from '../environment'

const audience = env('AUTH0_AUDIENCE')
const scope = env('AUTH0_SCOPE')

export const useAuthHeaders = async (): Promise<{
  headers: {
    Authorization: string
  }
}> => {
  const { getAccessTokenSilently } = useAuth0()
  const token = await getAccessTokenSilently({
    audience,
    scope,
  })

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}
