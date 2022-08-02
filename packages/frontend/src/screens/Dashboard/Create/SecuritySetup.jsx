import { useState, useCallback } from 'react'
import { useViewport } from 'use-viewport'
import styled from 'styled-components/macro'
import {
  Button,
  ButtonBase,
  Help,
  IconCross,
  IconPlus,
  Spacer,
  Split,
  Switch,
  TextCopy,
  TextInput,
  textStyle,
  GU,
} from '@pokt-foundation/ui'
import AppStatus from '../../../components/AppStatus/AppStatus'
import Box from '../../../components/Box/Box'
import {
  FREE_TIER_MAX_RELAYS,
  FREE_TIER_TOKENS,
} from '../../../lib/pocket-utils'

const INPUT_ADORNMENT_SETTINGS = {
  width: 4.5 * GU,
  padding: GU,
}

export default function SecuritySetup({ data, decrementScreen, updateData }) {
  const [userAgent, setUserAgent] = useState('')
  const [origin, setOrigin] = useState('')
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')

  const onWhitelistedUserAgentDelete = useCallback(
    (userAgent) => {
      const whitelistedUserAgents = data.whitelistUserAgents ?? []

      const filteredWhitelistedUserAgents = whitelistedUserAgents.filter(
        (u) => u !== userAgent
      )

      updateData({
        type: 'UPDATE_WHITELISTED_USER_AGENTS',
        payload: filteredWhitelistedUserAgents,
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateData]
  )
  const onWhitelistedOriginDelete = useCallback(
    (origin) => {
      const whitelistedOrigins = data.whitelistOrigins ?? []

      const filteredWhitelistedOrigins = whitelistedOrigins.filter(
        (o) => o !== origin
      )

      updateData({
        type: 'UPDATE_WHITELISTED_ORIGINS',
        payload: filteredWhitelistedOrigins,
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateData]
  )
  const setWhitelistedUserAgent = useCallback(() => {
    if (!userAgent) {
      return
    }
    const whitelistedUserAgents = data.whitelistUserAgents ?? []

    if (whitelistedUserAgents.indexOf(userAgent) !== -1) {
      return
    }

    updateData({
      type: 'UPDATE_WHITELISTED_USER_AGENTS',
      payload: [...whitelistedUserAgents, userAgent],
    })
    setUserAgent('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, updateData, userAgent])
  const setWhitelistedOrigin = useCallback(() => {
    if (!origin) {
      return
    }
    const whitelistedOrigins = data.whitelistOrigins ?? []

    if (whitelistedOrigins.indexOf(origin) !== -1) {
      return
    }

    updateData({
      type: 'UPDATE_WHITELISTED_ORIGINS',
      payload: [...whitelistedOrigins, origin],
    })
    setOrigin('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, origin, updateData])

  return (
    <>
      <Split
        primary={
          <>
            <p
              css={`
                ${textStyle('body2')}
                margin-bottom: ${2 * GU}px;
              `}
            >
              To maximize security for your application, you may add an
              additional secret key and/or whitelist user agents and origins.
            </p>
            <Spacer size={3 * GU} />
            <Box
              css={`
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
              `}
            >
              <div
                css={`
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                `}
              >
                <h3
                  css={`
                    ${textStyle('title2')}
                  `}
                >
                  Secret key required
                </h3>
                <Spacer size={1 * GU} />
                <Help
                  hint="What is this?"
                  placement={compactMode ? 'auto' : 'right'}
                >
                  Turn this on if you want to have an extra layer of security
                  for all of your requests. You'll have to send a password with
                  each request that we will verify. You'll have access to this
                  key once you create the application.
                </Help>
              </div>
              <Switch
                checked={data.secretKeyRequired ?? false}
                onChange={() =>
                  updateData({
                    type: 'UPDATE_REQUIRE_SECRET_KEY',
                    payload: !data.secretKeyRequired,
                  })
                }
              />
            </Box>
            <Spacer size={3 * GU} />
            <Box
              title="Whitelisted User-Agents"
              css={`
                h3 {
                  margin-bottom: ${1 * GU}px;
                }
                margin-bottom: ${3 * GU}px;
              `}
            >
              <TextInput
                wide
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                adornment={
                  <ButtonBase onClick={setWhitelistedUserAgent}>
                    <IconPlus />
                  </ButtonBase>
                }
                adornmentSettings={INPUT_ADORNMENT_SETTINGS}
                adornmentPosition="end"
              />
              <ul
                css={`
                  list-style: none;
                  margin-top: ${2 * GU}px;
                  li:not(:last-child) {
                    margin-bottom: ${2 * GU}px;
                  }
                `}
              >
                {data.whitelistUserAgents.map((agent) => (
                  <li key={agent}>
                    <WideTextCopy
                      onCopy={() => onWhitelistedUserAgentDelete(agent)}
                      adornment={<IconCross />}
                      value={agent}
                    />
                  </li>
                ))}
              </ul>
            </Box>
            <Box
              title="Whitelisted Origins"
              css={`
                h3 {
                  margin-bottom: ${1 * GU}px;
                }
              `}
            >
              <TextInput
                wide
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                adornment={
                  <ButtonBase onClick={setWhitelistedOrigin}>
                    <IconPlus />
                  </ButtonBase>
                }
                adornmentSettings={INPUT_ADORNMENT_SETTINGS}
                adornmentPosition="end"
              />
              <ul
                css={`
                  list-style: none;
                  margin-top: ${2 * GU}px;
                  li:not(:last-child) {
                    margin-bottom: ${2 * GU}px;
                  }
                `}
              >
                {data.whitelistOrigins.map((origin) => (
                  <li key={origin}>
                    <WideTextCopy
                      onCopy={() => onWhitelistedOriginDelete(origin)}
                      value={origin}
                      adornment={<IconCross />}
                    />
                  </li>
                ))}
              </ul>
            </Box>
          </>
        }
        secondary={
          <>
            <Button wide onClick={() => decrementScreen()}>
              Go back
            </Button>
            <Spacer size={3 * GU} />
            <AppStatus
              stakedTokens={FREE_TIER_TOKENS}
              maxDailyRelays={FREE_TIER_MAX_RELAYS}
            />
          </>
        }
      />
    </>
  )
}

const WideTextCopy = styled(TextCopy)`
  && {
    width: 100%;
    padding-left: 0;
  }
`
