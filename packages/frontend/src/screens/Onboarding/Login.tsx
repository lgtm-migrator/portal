import { Redirect, Link as RouterLink } from 'react-router-dom'
import 'styled-components/macro'
import { useAuth0 } from '@auth0/auth0-react'
import {
  Button,
  Link,
  Spacer,
  textStyle,
  GU,
  useTheme,
} from '@pokt-foundation/ui'
import Onboarding from '../../components/Onboarding/Onboarding'
import env from '../../environment'

export default function Login() {
  const { loginWithRedirect, isAuthenticated, user, logout } = useAuth0()
  const theme = useTheme()

  if (isAuthenticated && user?.email_verified) {
    return (
      <Redirect
        to={{
          pathname: '/home',
        }}
      />
    )
  }

  if (isAuthenticated && !user?.email_verified) {
    logout()
  }

  return (
    <Onboarding>
      <h1
        css={`
          ${textStyle('title1')};
          font-weight: 300;
          align-self: flex-start;
          line-height: 1;
        `}
      >
        Discover more about
        <span
          css={`
            display: block;
            font-weight: 700;
            color: ${theme.accentAlternative};
          `}
        >
          Pocket Portal
        </span>
      </h1>
      <Spacer size={3 * GU} />
      <h2
        css={`
          ${textStyle('title2')};
        `}
      >
        One endpoint and access to multiple chains
      </h2>
      <Spacer size={GU} />
      <p
        css={`
          color: ${theme.disabledContent};
        `}
      >
        The Portal lets you create an endpoint for all the chains you want you
        want in just a few clicks and provides you with the features you've come
        to expect in centralized API services, such as usage/uptime metrics and
        notifications/alerts.
      </p>
      <Spacer size={6 * GU} />
      <div
        css={`
          position: relative;
          z-index: 2;
          width: 100%;
          height: auto;
        `}
      >
        <Button
          type="submit"
          mode="primary"
          disabled={false}
          onClick={() => loginWithRedirect()}
          css={`
            width: ${22.5 * GU}px;
            margin-bottom: ${2 * GU}px;
          `}
        >
          Log in
        </Button>
        <p
          css={`
            ${textStyle('body3')}
          `}
        >
          Don't have an account?{' '}
          <RouterLink
            to={{
              pathname: '/signup',
            }}
            onClick={(event) => {
              event.preventDefault()
              loginWithRedirect({ screen_hint: 'signup' })
            }}
            component={Link}
            external={true}
          >
            Get started.
          </RouterLink>
        </p>
      </div>
    </Onboarding>
  )
}
