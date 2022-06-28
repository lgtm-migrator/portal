import { Redirect, Link as RouterLink } from 'react-router-dom'
import 'styled-components/macro'
import { useAuth0 } from '@auth0/auth0-react'
import { Button, Link, Spacer, textStyle, GU } from '@pokt-foundation/ui'
import Onboarding from '../../components/Onboarding/Onboarding'
import env from '../../environment'

export default function Login() {
  const { loginWithRedirect, isAuthenticated, user, logout } = useAuth0()

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
      <h2
        css={`
          ${textStyle('title1')};
          align-self: flex-start;
        `}
      >
        Welcome back
      </h2>
      <Spacer size={4 * GU} />
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
            max-width: ${22.5 * GU}px;
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
