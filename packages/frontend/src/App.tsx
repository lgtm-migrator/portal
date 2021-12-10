import { HashRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ViewportProvider } from 'use-viewport'
import { Main } from '@pokt-foundation/ui'
import DashboardRoutes from './screens/DashboardRoutes'

const DEFAULT_REFETCH_TIME = 15 * 1000 // 15s

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
      <Main>
        <ViewportProvider>
          <Router>
            <DashboardRoutes />
          </Router>
        </ViewportProvider>
      </Main>
    </QueryClientProvider>
  )
}

export default App
