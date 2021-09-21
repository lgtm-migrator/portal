import React, { useState, useCallback } from 'react'
import 'styled-components/macro'
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

export default function SecuritySetup({ data, decrementScreen, updateData }) {
  const [userAgent, setUserAgent] = useState('')
  const [origin, setOrigin] = useState('')

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
    const whitelistedUserAgents = data.whitelistUserAgents ?? []

    if (whitelistedUserAgents.indexOf(userAgent) !== -1) {
      return
    }

    updateData({
      type: 'UPDATE_WHITELISTED_USER_AGENTS',
      payload: [...whitelistedUserAgents, userAgent],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, updateData, userAgent])
  const setWhitelistedOrigin = useCallback(() => {
    const whitelistedOrigins = data.whitelistOrigins ?? []

    if (whitelistedOrigins.indexOf(origin) !== -1) {
      return
    }

    updateData({
      type: 'UPDATE_WHITELISTED_ORIGINS',
      payload: [...whitelistedOrigins, origin],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, origin, updateData])

  return (
    <>
      <Split
        primary={
          <>
            <Box>
              <p
                css={`
                  ${textStyle('body2')}
                  margin-bottom: ${2 * GU}px;
                `}
              >
                To maximize security for your application, you may add an
                additional secret key and/or whitelist user agents and origins.
              </p>
            </Box>
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
                <Help hint="What is this?">
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
              title="Whitelisted user-agents"
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
                    <TextCopy
                      onCopy={() => onWhitelistedUserAgentDelete(agent)}
                      adornment={<IconCross />}
                      value={agent}
                      css={`
                        width: 100%;
                        padding-left: 0;
                      `}
                    />
                  </li>
                ))}
              </ul>
            </Box>
            <Box
              title="Whitelisted origins"
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
                    <TextCopy
                      onCopy={() => onWhitelistedOriginDelete(origin)}
                      value={origin}
                      adornment={<IconCross />}
                      css={`
                        width: 100%;
                        padding-left: 0;
                      `}
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
