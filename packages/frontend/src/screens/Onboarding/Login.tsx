import React, { useCallback, useMemo, useState, useContext } from 'react'
import { Link as RouterLink, useHistory } from 'react-router-dom'
import { useMutation } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import 'styled-components/macro'
import { useAuth0 } from '@auth0/auth0-react'
import {
  Button,
  Field,
  Link,
  Spacer,
  TextInput,
  textStyle,
  useTheme,
  GU,
} from '@pokt-foundation/ui'
import Onboarding from '../../components/Onboarding/Onboarding'
import env from '../../environment'
import { FlagContext } from '../../contexts/flagsContext'
import { AmplitudeEvents } from '../../lib/analytics'

export default function Login() {
  const { flags } = useContext(FlagContext)

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [errors, setErrors] = useState([])
  const { loginWithRedirect } = useAuth0()
  const history = useHistory()

  const { isLoading, mutate } = useMutation(async function login(e) {
    if (!flags.useAuth0) {
      try {
        const path = `${env('BACKEND_URL')}/api/users/login`
        const res = await axios.post(
          path,
          {
            email,
            password,
          },
          {
            withCredentials: true,
          }
        )

        if (res.status === 200 || res.status === 204) {
          const userID = res.data.data.user._id

          if (env('PROD')) {
            amplitude.getInstance().setUserId(userID)
            amplitude.getInstance().logEvent(AmplitudeEvents.LoginComplete, {
              lastActiveDate: new Date().toISOString(),
            })
          }
          history.push({
            pathname: '/home',
          })
        }
      } catch (err) {
        const { errors = [] } = err?.response?.data

        setErrors(() => [...errors])
      }
    } else {
      await loginWithRedirect()
    }
  })

  const onEmailChange = useCallback((e) => setEmail(e.target.value), [])
  const onPasswordChange = useCallback((e) => setPassword(e.target.value), [])
  const onInputFocus = useCallback(() => {
    if (errors.length) {
      setErrors([])
    }
    if (emailError) {
      setEmailError(null)
    }
    if (passwordError) {
      setPasswordError(null)
    }
  }, [emailError, errors, passwordError])
  const onEmailBlur = useCallback(() => {
    if (!email) {
      const emailError = {
        id: 'INVALID_EMAIL',
        message: 'Email cannot be empty',
      }

      setEmailError(emailError)
    }
  }, [email])
  const onPasswordBlur = useCallback(() => {
    if (!password) {
      const passwordError = {
        id: 'INVALID_PASSWORD',
        message: 'Password cannot be empty',
      }

      setPasswordError(passwordError)
    }
  }, [password])

  const isSubmitDisabled = useMemo(
    () => isLoading || errors.length > 0 || emailError || passwordError,
    [emailError, errors, passwordError, isLoading]
  )

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
        {!flags.useAuth0 ? (
          <form
            onSubmit={!isSubmitDisabled ? mutate : undefined}
            css={`
              display: flex;
              flex-direction: column;
            `}
          >
            <Field label="Email" required>
              <TextInput
                wide
                value={email}
                placeholder="example@pokt.network"
                onChange={onEmailChange}
                onFocus={onInputFocus}
                onBlur={onEmailBlur}
              />
              <Spacer size={GU / 2} />
              {emailError && <ErrorMessage>{emailError.message}</ErrorMessage>}
              <ul
                css={`
                  list-style-type: none;
                `}
              >
                {errors.map(({ id, message }) => (
                  <li key={`${id}_${message}`}>
                    <ErrorMessage>{message}</ErrorMessage>
                  </li>
                ))}
              </ul>
            </Field>
            <Field label="Password" required>
              <TextInput
                wide
                value={password}
                placeholder="********"
                onChange={onPasswordChange}
                onFocus={onInputFocus}
                onBlur={onPasswordBlur}
                type="password"
              />
              <Spacer size={GU / 2} />
              {passwordError && (
                <ErrorMessage>{passwordError.message}</ErrorMessage>
              )}
            </Field>
            {passwordError && <Spacer size={3 * GU} />}
            <RouterLink
              to={{
                pathname: '/forgotpassword',
              }}
              component={Link}
              external={false}
              css={`
                && {
                  ${textStyle('body3')};
                  width: auto;
                  text-align: left;
                }
              `}
            >
              Forgot your password?
            </RouterLink>
            <Spacer size={3 * GU} />
            <Button
              type="submit"
              mode="primary"
              disabled={isSubmitDisabled}
              onClick={(e) => {
                e.preventDefault()
                mutate()
              }}
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
                component={Link}
                external={false}
              >
                Get started.
              </RouterLink>
            </p>
          </form>
        ) : (
          <>
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
                component={Link}
                external={false}
              >
                Get started.
              </RouterLink>
            </p>
          </>
        )}
      </div>
    </Onboarding>
  )
}

function ErrorMessage({ children }: any) {
  const theme = useTheme()

  return (
    <p
      css={`
        ${textStyle('body3')};
        color: ${theme.negative};
      `}
    >
      {children}
    </p>
  )
}
