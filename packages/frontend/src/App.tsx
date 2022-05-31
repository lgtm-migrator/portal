import { HashRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ViewportProvider } from 'use-viewport'
import { Auth0Provider, CacheLocation } from '@auth0/auth0-react'
import { Main } from '@pokt-foundation/ui'
import DashboardRoutes from './screens/DashboardRoutes'
import env from './environment'

const DEFAULT_REFETCH_TIME = 60 * 1000 // 15s

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchInterval: DEFAULT_REFETCH_TIME,
    },
  },
})

function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <Auth0Provider
        domain={env('AUTH0_DOMAIN')}
        clientId={env('AUTH0_CLIENT_ID')}
        audience={env('AUTH0_AUDIENCE')}
        scope={env('AUTH0_SCOPE')}
        useRefreshTokens={true}
        cacheLocation={env('AUTH0_CACHE_LOCATION') as CacheLocation}
        redirectUri={`${window.location.protocol}//${window.location.host}/#/home`}
      >
        <Main>
          <ViewportProvider>
            <Router>
              <DashboardRoutes />
            </Router>
          </ViewportProvider>
        </Main>
      </Auth0Provider>
    </QueryClientProvider>
  )
}

export default App
