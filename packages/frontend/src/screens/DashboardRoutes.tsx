import { Redirect, Route, Switch } from 'react-router-dom'
import { useViewport } from 'use-viewport'
import 'styled-components/macro'
import { useTheme } from '@pokt-foundation/ui'
import { ErrorBoundary } from '@sentry/react'
import ApplicationDetail from './Dashboard/ApplicationDetail/ApplicationDetail'
import Dashboard from './Dashboard/Dashboard'
import Fallback from './Fallback'
import ForgotPassword from './Onboarding/ForgotPassword'
import Login from './Onboarding/Login'
import NetworkStatus from './Dashboard/Network/NetworkStatus'
import NewPassword from './Onboarding/NewPassword'
import Signup from './Onboarding/Signup'
import Validate from './Onboarding/Validate'
import { useAuth0 } from '@auth0/auth0-react'

export default function DashboardRoutes() {
  const { isAuthenticated, user } = useAuth0()
  const { within } = useViewport()
  const theme = useTheme()

  const compactMode = within(-1, 'medium')

  return (
    <div
      css={`
        /*
          We wanna enforce a non-scrollable "dashboard" view inside the app,
          so we force the container div to always be height and width of the screen.
          For mobile devices we don't want this restriction, so we only set this rule
          on large screen sizes.
        */
        min-width: 100vw;
        height: 100vh;
        background: ${theme.background};
        /* We also wanna "trap" any absolute elements so that they don't end up behind the div. */
        display: relative;
        /* ${!compactMode &&
        `
          max-width: 100vw;
          max-height: 100vh;
        `} */
        overflow-x: hidden;
      `}
    >
      <ErrorBoundary fallback={Fallback}>
        <Switch>
          <Route exact path={`/`}>
            <Login />
          </Route>
          <Route exact path={`/signup`}>
            <Signup />
          </Route>
          <Route exact path={`/login`}>
            <Login />
          </Route>
          <Route exact path={`/validate`}>
            <Validate />
          </Route>
          <Route exact path={`/forgotpassword`}>
            <ForgotPassword />
          </Route>
          <Route exact path={`/newpassword`}>
            <NewPassword />
          </Route>

          <Dashboard>
            {/* <Route exact path={`/home`}>
              <NetworkStatus />
            </Route>
            <Route path={`/app/:appId`}>
              <ApplicationDetail />
            </Route> */}
            <Route
              exact
              path={`/home`}
              render={() =>
                isAuthenticated && user?.email_verified ? (
                  <NetworkStatus />
                ) : (
                  <Redirect to="/validate" />
                )
              }
            />
            <Route
              path={`/app/:appId`}
              render={() =>
                isAuthenticated && user?.email_verified ? (
                  <ApplicationDetail />
                ) : (
                  <Redirect to="/validate" />
                )
              }
            />
          </Dashboard>
        </Switch>
      </ErrorBoundary>
    </div>
  )
}
