import { useCallback, useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useQuery } from 'react-query'
import axios from 'axios'
import { getAddressFromPublicKey } from 'pocket-tools'
import { useViewport } from 'use-viewport'
import Styled from 'styled-components/macro'
import * as Sentry from '@sentry/react'
import {
  Button,
  CircleGraph,
  DataView,
  Spacer,
  Split,
  textStyle,
  useTheme,
  useToast,
  GU,
  TextCopy,
  IconClock,
} from '@pokt-foundation/ui'
import Card from '../../../components/Card/Card'
import FloatUp from '../../../components/FloatUp/FloatUp'
import { log, shorten } from '../../../lib/utils'
import env from '../../../environment'
import { KNOWN_QUERY_SUFFIXES } from '../../../known-query-suffixes'
import { sentryEnabled } from '../../../sentry'
import { useUser } from '../../../contexts/UserContext'
import MessagePopup from '../../../components/MessagePopup/MessagePopup'
import FeedbackBox from '../../../components/FeedbackBox/FeedbackBox'
import { useAuthHeaders } from '../../../hooks/useAuthHeaders'

const REFETCH_INTERVAL = 60 * 1000

const getDateFromTimestamp = (timestamp: string): string => {
  const months: { [key: number]: string } = {
    0: 'Jan',
    1: 'Feb',
    2: 'Mar',
    3: 'Apr',
    4: 'May',
    5: 'Jun',
    6: 'Jul',
    7: 'Aug',
    8: 'Sep',
    9: 'Oct',
    10: 'Nov',
    11: 'Dec',
  }

  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  const hour = date.getUTCHours()
  const minutes = date.getUTCMinutes()

  return `${day} ${month} ${year}, ${hour}:${
    minutes.toString().length < 2 ? `0${minutes}` : minutes
  }`
}

interface SuccessDetailsProps {
  id: string
  maxDailyRelays: number
  stakedTokens: number
  successfulRelays: number
  totalRelays: number
}

interface EndpointRpcError {
  bytes: number
  message: string
  method: string
  nodepublickey: string
  timestamp: string
}

export default function SuccessDetails({
  id,
  successfulRelays,
  totalRelays,
}: SuccessDetailsProps) {
  const { userLoading } = useUser()
  const theme = useTheme()
  const toast = useToast()
  const [activeClockElement, setActiveClockElement] = useState<string>('')
  const [clockMsgVisible, setClockMsgVisible] = useState<boolean>(false)
  const { within } = useViewport()
  const headers = useAuthHeaders()

  const onClockMsgOpen = useCallback((timestamp: string) => {
    setActiveClockElement(timestamp)
    setClockMsgVisible(true)
  }, [])

  const onClockMsgClose = useCallback(() => {
    setActiveClockElement('')
    setClockMsgVisible(false)
  }, [])

  const compactMode = within(-1, 'medium')

  const { isLoading, data } = useQuery(
    [KNOWN_QUERY_SUFFIXES.LATEST_FILTERED_DETAILS, id],
    async function getFilteredRelays() {
      const errorMetricsURL = `${env(
        'BACKEND_URL'
      )}/api/v2/lb/error-metrics/${id}`

      if (!id) {
        return []
      }

      try {
        const { data } = await axios.get(errorMetricsURL, await headers)

        const transformedErrorMetrics = await Promise.all(
          data.map(async (e: EndpointRpcError) => {
            const nodeAddress = await getAddressFromPublicKey(e.nodepublickey)

            return {
              bytes: e.bytes,
              message: e.message,
              method: e.method,
              timestamp: e.timestamp,
              nodeAddress,
            }
          })
        )

        const errorMetrics = transformedErrorMetrics.filter(
          (e) => !e.method.includes('check')
        )

        return {
          errorMetrics,
        }
      } catch (err) {
        if (sentryEnabled) {
          Sentry.configureScope((scope) => {
            scope.setTransactionName(
              KNOWN_QUERY_SUFFIXES.LATEST_FILTERED_DETAILS
            )
          })
          Sentry.captureException(err)
        }
        log('SUCCESS DETAILS ERROR', Object.entries(err as Error))
        throw err
      }
    },
    {
      keepPreviousData: true,
      refetchInterval: REFETCH_INTERVAL,
      enabled: !userLoading,
    }
  )

  const successRate = useMemo(() => {
    return totalRelays === 0 ? 0 : successfulRelays / totalRelays
  }, [totalRelays, successfulRelays])
  const failureRate = useMemo(() => {
    return totalRelays === 0
      ? 0
      : (totalRelays - successfulRelays) / totalRelays
  }, [successfulRelays, totalRelays])

  return (
    <FloatUp
      loading={false}
      content={() => (
        <Split
          primary={
            <>
              {compactMode && (
                <>
                  <NavigationOptions />
                  <Spacer size={3 * GU} />
                </>
              )}
              <Card
                css={`
                  padding: ${3 * GU}px ${4 * GU}px ${3 * GU}px ${4 * GU}px;
                `}
              >
                <div
                  css={`
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    width: 100%;
                    height: 100%;
                    ${compactMode &&
                    `
                      flex-direction: column;
                    `}
                  `}
                >
                  <div
                    css={`
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                    `}
                  >
                    <h2
                      css={`
                        ${textStyle('title2')}
                      `}
                    >
                      {Intl.NumberFormat().format(totalRelays)}
                      <span
                        css={`
                          display: block;
                          font-size: ${2 * GU}px;
                          font-weight: 400;
                        `}
                      >
                        Total requests
                      </span>
                    </h2>
                    <h2
                      css={`
                        ${textStyle('body3')}
                      `}
                    >
                      Last 24 hours
                    </h2>
                  </div>
                  <Inline>
                    <CircleGraph
                      value={Math.min(successRate, 1)}
                      size={12 * GU}
                      color="url(#successful-requests-gradient)"
                      strokeWidth={GU * 2}
                    >
                      <defs>
                        <linearGradient id="successful-requests-gradient">
                          <stop
                            offset="10%"
                            stop-opacity="100%"
                            stop-color={theme.accentSecondAlternative}
                          />
                          <stop
                            offset="90%"
                            stop-opacity="100%"
                            stop-color={theme.accent}
                          />
                        </linearGradient>
                      </defs>
                    </CircleGraph>
                    <Spacer size={1 * GU} />
                    <div>
                      <h2
                        css={`
                          ${textStyle('title2')}
                        `}
                      >
                        {Intl.NumberFormat().format(
                          Math.min(successfulRelays, totalRelays)
                        )}
                        <span
                          css={`
                            display: block;
                            font-size: ${2 * GU}px;
                            font-weight: 400;
                          `}
                        >
                          Processed requests
                        </span>
                      </h2>
                      <h2
                        css={`
                          font-size: ${2 * GU}px;
                          font-weight: 700;
                        `}
                      >
                        Successful Requests
                      </h2>
                    </div>
                  </Inline>
                  {compactMode && <Spacer size={3 * GU} />}
                  <Inline>
                    <CircleGraph
                      value={Math.max(0, failureRate)}
                      size={12 * GU}
                      color="url(#error-requests-gradient)"
                      strokeWidth={GU * 2}
                    >
                      <defs>
                        <linearGradient id="error-requests-gradient">
                          <stop
                            offset="10%"
                            stop-opacity="100%"
                            stop-color={theme.errorEnd}
                          />
                          <stop
                            offset="90%"
                            stop-opacity="100%"
                            stop-color={theme.errorStart}
                          />
                        </linearGradient>
                      </defs>
                    </CircleGraph>
                    <Spacer size={1 * GU} />
                    <div>
                      <h2
                        css={`
                          ${textStyle('title2')}
                        `}
                      >
                        {Intl.NumberFormat().format(
                          Math.max(totalRelays - successfulRelays, 0)
                        )}
                        <span
                          css={`
                            display: block;
                            font-size: ${2 * GU}px;
                            font-weight: 400;
                          `}
                        >
                          Failed Requests
                        </span>
                      </h2>
                      <h2
                        css={`
                          font-size: ${2 * GU}px;
                          font-weight: 700;
                        `}
                      >
                        Error rate
                      </h2>
                    </div>
                  </Inline>
                </div>
              </Card>
              <Spacer size={3 * GU} />
              <Card
                css={`
                  padding: 24px;

                  table thead th {
                    height: 0;
                    padding: 0;
                    border: none;
                  }

                  table tbody tr td {
                    border-color: ${theme.disabled};
                    padding-left: 0;
                  }

                  table + div {
                    border: none;
                  }
                `}
              >
                <h2
                  css={`
                    margin: 0 0 ${GU * 3}px 0;
                    font-size: ${GU * 2 + 2}px;
                    font-weight: 700;
                    color: ${theme.inactive};
                  `}
                >
                  Fail Requests Detail
                </h2>
                <Spacer size={3 * GU} />
                <DataView
                  fields={['Request type', 'Bytes transferred', 'Service Node']}
                  entries={data?.errorMetrics ?? ([] as EndpointRpcError[])}
                  renderEntry={({
                    bytes,
                    method,
                    nodeAddress,
                    timestamp,
                  }: EndpointRpcError & { nodeAddress: string }) => {
                    return [
                      <div
                        css={`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <div
                          css={`
                            display: inline-block;
                            width: ${1.5 * GU}px;
                            height: ${1.5 * GU}px;
                            border-radius: 50% 50%;
                            background: ${theme.negative};
                            box-shadow: ${theme.negative} 0px 2px 8px 0px;
                            margin-right: ${GU}px;
                          `}
                        />
                        <p
                          css={`
                            ${textStyle('body3')};
                            max-width: ${!compactMode ? 19 * GU : 10 * GU}px;
                            overflow: hidden;
                          `}
                        >
                          {method ? method : 'Unknown'}
                        </p>
                      </div>,
                      <p
                        css={`
                          ${textStyle('body3')}
                        `}
                      >
                        {bytes}B
                      </p>,
                      <div
                        css={`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <TextCopy
                          value={shorten(nodeAddress, 16)}
                          onCopy={() => {
                            toast('Node address copied to cliboard')
                            navigator.clipboard.writeText(nodeAddress)
                          }}
                          css={`
                            width: 100%;
                            > div > input {
                              background: transparent;
                            }
                          `}
                        />
                        <div
                          css={`
                            display: inline-block;
                            width: ${1.5 * GU}px;
                            height: ${1.5 * GU}px;
                            border-radius: 50% 50%;
                            background: ${theme.negative};
                            box-shadow: ${theme.negative} 0px 2px 8px 0px;
                          `}
                        />
                        ,
                        <p
                          css={`
                            ${textStyle('body3')}
                          `}
                        >
                          {method ? method : 'Unknown'}
                        </p>
                        ,
                        <p
                          css={`
                            ${textStyle('body3')}
                          `}
                        >
                          {bytes}B
                        </p>
                        ,
                        <div
                          css={`
                            display: flex;
                            align-items: center;
                          `}
                        >
                          <TextCopy
                            value={shorten(nodeAddress, 16)}
                            onCopy={() =>
                              toast('Node address copied to cliboard')
                            }
                            css={`
                              width: 100%;
                              > div > input {
                                background: transparent;
                              }
                            `}
                          />
                          <div
                            onMouseEnter={() => onClockMsgOpen(timestamp)}
                            onMouseLeave={onClockMsgClose}
                            css={`
                              position: relative;
                            `}
                          >
                            <IconClock
                              css={`
                                color: ${theme.accentAlternative};
                                width: ${GU * 2}px;
                                height: ${GU * 2}px;
                              `}
                            />
                            <MessagePopup
                              show={
                                clockMsgVisible &&
                                timestamp === activeClockElement
                              }
                              css={`
                                top: -34px;
                                left: -95px;
                                height: ${GU * 4}px;
                                width: ${GU * 16}px;
                              `}
                            >
                              {getDateFromTimestamp(timestamp)}
                            </MessagePopup>
                          </div>
                        </div>
                      </div>,
                    ]
                  }}
                  renderEntryExpansion={({ message }: EndpointRpcError) => {
                    const formattedMessage = message?.includes('html')
                      ? 'Server Error'
                      : message

                    return formattedMessage
                      ? [<p>{formattedMessage}</p>]
                      : undefined
                  }}
                  status={isLoading ? 'loading' : 'default'}
                />
              </Card>
            </>
          }
          secondary={
            <>
              {!compactMode && (
                <>
                  <NavigationOptions />

                  <Spacer size={4 * GU} />

                  <FeedbackBox />
                </>
              )}
            </>
          }
        />
      )}
    />
  )
}

function NavigationOptions() {
  const history = useHistory()

  return (
    <Button wide mode="secondary" onClick={() => history.goBack()}>
      Back to application
    </Button>
  )
}

const Inline = Styled.div`
  display: flex;
  align-items: center;
`
