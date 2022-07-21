import { useCallback, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import 'styled-components/macro'
import { Button, Spacer, textStyle, GU } from '@pokt-foundation/ui'
import Onboarding from '../../components/Onboarding/Onboarding'
import { useAuth0 } from '@auth0/auth0-react'

export default function Validate() {
  const history = useHistory()
  const { loginWithRedirect, user } = useAuth0()

  const goToLogin = useCallback(() => history.push('/login'), [history])

  useEffect(() => {
    if (user?.email_verified) {
      goToLogin()
    }
  }, [user?.email_verified, goToLogin])

  return (
    <Onboarding>
      <h1
        css={`
          ${textStyle('title1')}
          align-self: flex-start;
        `}
      >
        Account Verification Pending
      </h1>
      <p
        css={`
          ${textStyle('body2')}
        `}
      >
        We sent you an email with a link to verify your account. Please complete
        this action to proceed with login.
      </p>
      <Spacer size={4 * GU} />
      <Button
        mode="primary"
        onClick={() => loginWithRedirect()}
        css={`
          width: ${22.5 * GU}px;
        `}
      >
        Log in
      </Button>
    </Onboarding>
  )
}
