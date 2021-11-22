import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import styled from 'styled-components/macro'
import {
  Button,
  ButtonBase,
  IconPlus,
  IconCross,
  Spacer,
  Split,
  Switch,
  TextCopy,
  TextInput,
  textStyle,
  useToast,
  GU,
} from '@pokt-foundation/ui'
import * as Sentry from '@sentry/react'
import AppStatus from '../../../components/AppStatus/AppStatus'
import Box from '../../../components/Box/Box'
import FloatUp from '../../../components/FloatUp/FloatUp'
import env from '../../../environment'
import {
  KNOWN_MUTATION_SUFFIXES,
  KNOWN_QUERY_SUFFIXES,
} from '../../../known-query-suffixes'
import { sentryEnabled } from '../../../sentry'

const INPUT_ADORNMENT_SETTINGS = {
  width: 4.5 * GU,
  padding: GU,
}

export default function Security({ appData, stakedTokens, maxDailyRelays }) {
  const [origin, setOrigin] = useState('')
  const [origins, setOrigins] = useState([])
  const [secretKeyRequired, setSecretKeyRequired] = useState(false)
  const [userAgent, setUserAgent] = useState('')
  const [userAgents, setUserAgents] = useState([])
  const [hasChanged, setHasChanged] = useState(false)
  const history = useHistory()
  const toast = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    setUserAgents((agents) => {
      const currentUserAgents = appData.gatewaySettings.whitelistUserAgents
        .length
        ? [...appData.gatewaySettings.whitelistUserAgents]
        : []

      const filteredStateUserAgents = agents.filter(
        (a) => !currentUserAgents.includes(a)
      )

      return [...currentUserAgents, ...filteredStateUserAgents]
    })
    setOrigins((origins) => {
      const currentOrigins = appData.gatewaySettings.whitelistOrigins.length
        ? [...appData.gatewaySettings.whitelistOrigins]
        : []

      const filteredStateOrigins = origins.filter(
        (o) => !currentOrigins.includes(o)
      )

      return [...currentOrigins, ...filteredStateOrigins]
    })
    setSecretKeyRequired(appData.gatewaySettings.secretKeyRequired)
  }, [appData])

  const { mutate } = useMutation(async function updateApplicationSettings() {
    const path = `${env('BACKEND_URL')}/api/${
      appData.isLb ? 'lb' : 'applications'
    }/${appData.id}`

    try {
      await axios.put(
        path,
        {
          gatewaySettings: {
            whitelistOrigins: origins,
            whitelistUserAgents: userAgents,
            secretKeyRequired,
          },
        },
        {
          withCredentials: true,
        }
      )

      queryClient.invalidateQueries(KNOWN_QUERY_SUFFIXES.USER_APPS)

      toast('Security preferences updated')
      history.goBack()
    } catch (err) {
      if (sentryEnabled) {
        Sentry.configureScope((scope) => {
          scope.setTransactionName(
            `QUERY ${KNOWN_MUTATION_SUFFIXES.SECURITY_UPDATE_MUTATION}`
          )
        })
        Sentry.captureException(err)
      }
      throw err
    }
  })

  const onSecretKeyRequiredChange = useCallback(() => {
    setHasChanged(true)
    setSecretKeyRequired((r) => !r)
  }, [])
  const setWhitelistedUserAgent = useCallback(() => {
    if (userAgent) {
      setHasChanged(true)
      setUserAgents((userAgents) => [...userAgents, userAgent])
    }
    setUserAgent('')
  }, [userAgent])
  const setWhitelistedOrigin = useCallback(() => {
    if (origin) {
      setHasChanged(true)
      setOrigins((origins) => [...origins, origin])
    }
    setOrigin('')
  }, [origin])
  const onDeleteUserAgentClick = useCallback((userAgent) => {
    setHasChanged(true)
    setUserAgents((userAgents) => [
      ...userAgents.filter((u) => u !== userAgent),
    ])
  }, [])
  const onDeleteOriginClick = useCallback((origin) => {
    setHasChanged(true)
    setOrigins((origins) => [...origins.filter((o) => o !== origin)])
  }, [])

  const isSaveDisabled = useMemo(() => !hasChanged, [hasChanged])

  return (
    <FloatUp
      content={() => (
        <>
          <Split
            primary={
              <>
                <p
                  css={`
                    ${textStyle('body2')}
                  `}
                >
                  To maximize the security of your application, you should
                  activate the private secret key for all requests and enable
                  the use of whitelist user agents and origins.
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
                      Private Secret Key Required
                    </h3>
                  </div>
                  <Switch
                    checked={secretKeyRequired}
                    onChange={onSecretKeyRequiredChange}
                  />
                </Box>
                <Spacer size={3 * GU} />
                <Box
                  title="Whitelisted User-Agents"
                  css={`
                    h3 {
                      margin-bottom: ${2 * GU}px;
                    }
                    margin-bottom: ${3 * GU}px;
                  `}
                >
                  <TextInput
                    wide
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                    adornment={
                      <ButtonBase
                        onClick={setWhitelistedUserAgent}
                        css={`
                          && {
                            display: flex;
                          }
                        `}
                      >
                        <IconPlus />
                      </ButtonBase>
                    }
                    adornmentPosition="end"
                    adornmentSettings={INPUT_ADORNMENT_SETTINGS}
                  />
                  <ul
                    css={`
                      list-style: none;
                      margin-top: ${2 * GU}px;
                      li:not(:last-child) {
                        margin-bottom: ${2 * GU}px;
                      }
                      padding-left: 0;
                    `}
                  >
                    {userAgents.map((agent, index) => (
                      <li key={agent}>
                        <WideTextCopy
                          key={`${agent}/${index}`}
                          onCopy={() => onDeleteUserAgentClick(agent)}
                          value={agent}
                          adornment={<IconCross />}
                        />
                      </li>
                    ))}
                  </ul>
                </Box>
                <Box
                  title="Whitelisted Origins"
                  css={`
                    h3 {
                      margin-bottom: ${2 * GU}px;
                    }
                  `}
                >
                  <TextInput
                    wide
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    adornment={
                      <ButtonBase
                        onClick={setWhitelistedOrigin}
                        css={`
                          && {
                            display: flex;
                          }
                        `}
                      >
                        <IconPlus />
                      </ButtonBase>
                    }
                    adornmentPosition="end"
                    adornmentSettings={INPUT_ADORNMENT_SETTINGS}
                  />
                  <ul
                    css={`
                      list-style: none;
                      margin-top: ${2 * GU}px;
                      li:not(:last-child) {
                        margin-bottom: ${2 * GU}px;
                        padding-left: 0;
                      }
                    `}
                  >
                    {origins.map((origin, index) => (
                      <li key={origin}>
                        <WideTextCopy
                          key={`${origin}/${index}`}
                          adornment={<IconCross />}
                          onCopy={() => onDeleteOriginClick(origin)}
                          value={origin}
                        />
                      </li>
                    ))}
                  </ul>
                </Box>
              </>
            }
            secondary={
              <>
                <Button
                  wide
                  mode="primary"
                  disabled={isSaveDisabled}
                  onClick={mutate}
                >
                  Save Changes
                </Button>
                <Spacer size={2 * GU} />
                <Button wide onClick={() => history.goBack()}>
                  Go Back
                </Button>
                <Spacer size={2 * GU} />
                <AppStatus
                  stakedTokens={stakedTokens}
                  maxDailyRelays={maxDailyRelays}
                />
              </>
            }
          />
        </>
      )}
    />
  )
}

const WideTextCopy = styled(TextCopy)`
  && {
    width: 100%;
    padding-left: 0;
  }
`
