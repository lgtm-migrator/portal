import { useCallback, useMemo, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import { useViewport } from 'use-viewport'
import Styled from 'styled-components/macro'
import { UserLB } from '@pokt-foundation/portal-types'
import {
  Button,
  CircleGraph,
  Link,
  Spacer,
  Split,
  Switch,
  color,
  textStyle,
  useTheme,
  useToast,
  GU,
} from '@pokt-foundation/ui'
import * as Sentry from '@sentry/react'
import Box from '../../../components/Box/Box'
import FloatUp from '../../../components/FloatUp/FloatUp'
import { formatNumberToSICompact } from '../../../lib/formatting-utils'
import { log } from '../../../lib/utils'
import env from '../../../environment'
import {
  KNOWN_MUTATION_SUFFIXES,
  KNOWN_QUERY_SUFFIXES,
} from '../../../known-query-suffixes'
import { sentryEnabled } from '../../../sentry'
import { UserLBDailyRelayBucket } from 'packages/types/src'
import { useUsageColor } from './application-utils'
import { AmplitudeEvents } from '../../../lib/analytics'

const GRAPH_SIZE = 130

const DEFAULT_PERCENTAGES = {
  quarter: false,
  half: false,
  threeQuarters: true,
  full: true,
}

interface NotificationsProps {
  appData: UserLB
  dailyRelays: UserLBDailyRelayBucket[]
  maxDailyRelays: number
}

export default function Notifications({
  appData,
  dailyRelays,
  maxDailyRelays,
}: NotificationsProps) {
  const [chosenPercentages, setChosenPercentages] = useState(
    appData?.notificationSettings ?? DEFAULT_PERCENTAGES
  )
  const [hasChanged, setHasChanged] = useState(false)
  const history = useHistory()
  const { within } = useViewport()
  const toast = useToast()
  const { appId } = useParams<{ appId: string }>()
  const queryClient = useQueryClient()
  const { isLoading: isNotificationsLoading, mutate } = useMutation(
    async function updateNotificationSettings() {
      const path = `${env('BACKEND_URL')}/api/lb/notifications/${appId}`

      const { quarter, half, threeQuarters, full } = chosenPercentages

      try {
        await axios.put(
          path,
          {
            quarter,
            half,
            threeQuarters,
            full,
          },
          {
            withCredentials: true,
          }
        )

        queryClient.invalidateQueries(KNOWN_QUERY_SUFFIXES.USER_APPS)

        if (env('PROD')) {
          amplitude
            .getInstance()
            .logEvent(AmplitudeEvents.NotificationSettingsChange, {
              endpointId: appId,
            })
        }
        setHasChanged(false)
        toast('Notification preferences updated')
        history.goBack()
      } catch (err) {
        if (sentryEnabled) {
          Sentry.configureScope((scope) => {
            scope.setTransactionName(
              `QUERY ${KNOWN_MUTATION_SUFFIXES.NOTIFICATION_UPDATE_MUTATION}`
            )
          })
          Sentry.captureException(err)
        }
        log('NOTIFICATION ERROR', Object.entries(err as Error))
        throw err
      }
    }
  )

  const compactMode = within(-1, 'medium')

  const highestDailyAmount = useMemo(
    () =>
      dailyRelays.reduce(
        (highest, { daily_relays: dailyRelays }) =>
          Math.max(highest, dailyRelays),
        0
      ),
    [dailyRelays]
  )

  const lowestDailyAmount = useMemo(
    () =>
      dailyRelays.length === 0
        ? 0
        : dailyRelays.reduce(
            (lowest, { daily_relays: dailyRelays }) =>
              Math.min(lowest, dailyRelays),
            Number.POSITIVE_INFINITY
          ),
    [dailyRelays]
  )

  const totalDailyRelays = useMemo(() => {
    return dailyRelays.length === 0
      ? 0
      : dailyRelays.reduce(
          (sum, { daily_relays: dailyRelays = 0 }) => sum + dailyRelays,
          0
        ) / dailyRelays.length
  }, [dailyRelays])

  const averageUsageColor = useUsageColor(totalDailyRelays / maxDailyRelays)
  const maxUsageColor = useUsageColor(highestDailyAmount / maxDailyRelays)
  const minUsageColor = useUsageColor(lowestDailyAmount / maxDailyRelays)

  const onChosePercentageChange = useCallback(
    (chosenPercentage) => {
      setHasChanged(true)
      setChosenPercentages({
        ...chosenPercentages,
        // @ts-ignore
        [chosenPercentage]: !chosenPercentages[chosenPercentage],
      })
    },
    [chosenPercentages]
  )

  const isSubmitDisabled = useMemo(
    () => isNotificationsLoading || !hasChanged,
    [hasChanged, isNotificationsLoading]
  )

  const maxRelays = formatNumberToSICompact(maxDailyRelays)

  return (
    <FloatUp
      loading={false}
      content={() => (
        <Split
          primary={
            <>
              {compactMode && (
                <>
                  <NavigationOptions
                    onChangeSave={mutate}
                    disabled={isSubmitDisabled}
                  />
                  <Spacer size={2 * GU} />
                </>
              )}
              <p
                css={`
                  ${textStyle('body2')}
                `}
              >
                Set up usage alerts to be warned when you are approaching your
                relay limits. The Portal automatically redirects all surplus
                relays to our backup infrastructure. If you want all relays to
                be unstoppable, stay under your limit or contact the team to up
                your stake.
              </p>
              <Spacer size={2 * GU} />
              <Box>
                <div
                  css={`
                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    ${compactMode &&
                    `
                      flex-direction: column;
                      align-items: flex-start;
                    `}
                  `}
                >
                  <h2
                    css={`
                      ${textStyle('title2')}
                    `}
                  >
                    Weekly Bandwidth Usage
                  </h2>
                  {compactMode && <Spacer size={1 * GU} />}
                  <h3
                    css={`
                      ${textStyle('body3')}
                    `}
                  >
                    Max relays per day: {maxRelays}
                  </h3>
                </div>
                <Spacer size={compactMode ? 2 * GU : 5.5 * GU} />
                <Inline>
                  <GraphContainer>
                    <CircleGraph
                      value={Math.min(totalDailyRelays / maxDailyRelays, 1)}
                      size={GRAPH_SIZE}
                      color={averageUsageColor}
                      strokeWidth={GU * 2 + 4}
                    />
                    <Spacer size={1 * GU} />
                    <Stack
                      css={`
                        display: flex;
                        flex-direction: column;
                      `}
                    >
                      <Title>
                        <CenteredContainer>AVG Usage</CenteredContainer>
                        {Intl.NumberFormat().format(
                          Number(totalDailyRelays.toFixed(0))
                        )}{' '}
                        Relays
                      </Title>
                    </Stack>
                  </GraphContainer>
                  <Spacer size={2 * GU} />
                  <GraphContainer>
                    <CircleGraph
                      value={Math.min(highestDailyAmount / maxDailyRelays, 1)}
                      size={GRAPH_SIZE}
                      color={maxUsageColor}
                      strokeWidth={GU * 2 + 4}
                    />
                    <Spacer size={1 * GU} />
                    <Stack
                      css={`
                        display: flex;
                        flex-direction: column;
                      `}
                    >
                      <Title>
                        <CenteredContainer>Max Usage</CenteredContainer>
                        {Intl.NumberFormat().format(highestDailyAmount)} Relays
                      </Title>
                    </Stack>
                  </GraphContainer>
                  <Spacer size={2 * GU} />
                  <GraphContainer>
                    <CircleGraph
                      value={lowestDailyAmount / maxDailyRelays}
                      size={GRAPH_SIZE}
                      color={minUsageColor}
                      strokeWidth={GU * 2 + 4}
                    />
                    <Spacer size={1 * GU} />
                    <Stack
                      css={`
                        display: flex;
                        flex-direction: column;
                      `}
                    >
                      <Title
                        css={`
                          ${textStyle('body3')}
                        `}
                      >
                        <CenteredContainer>Min Usage</CenteredContainer>
                        {Intl.NumberFormat().format(lowestDailyAmount)} Relays
                      </Title>
                    </Stack>
                  </GraphContainer>
                </Inline>
                <Spacer size={5 * GU} />
                <p
                  css={`
                    ${textStyle('body4')}
                    text-align: center;
                  `}
                >
                  These values are calculated on a period of 7 days.
                </p>
              </Box>
              <Spacer size={2.5 * GU} />
              <p
                css={`
                  ${textStyle('body3')}
                `}
              >
                If you need more relays for your application or you are looking
                to stake your own POKT, please{' '}
                <Link href="mailto:sales@pokt.netowork?subject=Portal Contact">
                  contact us
                </Link>{' '}
                and our team will find a solution for you.
              </p>
            </>
          }
          secondary={
            <>
              {!compactMode && (
                <>
                  <NavigationOptions
                    onChangeSave={mutate}
                    disabled={isSubmitDisabled}
                  />
                  <Spacer size={2 * GU} />
                </>
              )}
              <Box title="Activate Alerts">
                <p
                  css={`
                    ${textStyle('body2')}
                  `}
                >
                  We will send an email when your usage crosses the thresholds
                  specified below.
                </p>
              </Box>
              <Spacer size={2 * GU} />
              <NotificationPreference
                level="quarter"
                checked={chosenPercentages.quarter}
                onChange={() => onChosePercentageChange('quarter')}
                maxRelays={maxRelays}
              />
              <Spacer size={2 * GU} />
              <NotificationPreference
                level="half"
                checked={chosenPercentages.half}
                onChange={() => onChosePercentageChange('half')}
                maxRelays={maxRelays}
              />
              <Spacer size={2 * GU} />
              <NotificationPreference
                level="threeQuarters"
                checked={chosenPercentages.threeQuarters}
                onChange={() => onChosePercentageChange('threeQuarters')}
                maxRelays={maxRelays}
              />
              <Spacer size={2 * GU} />
              <NotificationPreference
                level="full"
                checked={chosenPercentages.full}
                onChange={() => onChosePercentageChange('full')}
                maxRelays={maxRelays}
              />
            </>
          }
        />
      )}
    />
  )
}

interface NavigationOptionsProps {
  onChangeSave: () => void
  disabled: boolean
}

function NavigationOptions({ onChangeSave, disabled }: NavigationOptionsProps) {
  const history = useHistory()

  return (
    <>
      <Button wide onClick={onChangeSave} disabled={disabled}>
        Save changes
      </Button>
      <Spacer size={2 * GU} />
      <Button wide onClick={() => history.goBack()}>
        Back to application
      </Button>
    </>
  )
}

interface NotificationPreferenceProps {
  level: string
  checked: boolean
  onChange: () => void
  maxRelays: string
}

function NotificationPreference({
  level,
  checked,
  onChange,
  maxRelays,
}: NotificationPreferenceProps) {
  const theme = useTheme()

  const backgroundColor = useMemo(() => {
    if (level === 'quarter') {
      return theme.positive
    } else if (level === 'half') {
      return theme.yellow
    } else if (level === 'threeQuarters') {
      return theme.warning
    } else {
      return theme.negative
    }
  }, [level, theme])

  const usagePercentage = useMemo(() => {
    if (level === 'quarter') {
      return '25%'
    } else if (level === 'half') {
      return '50%'
    } else if (level === 'threeQuarters') {
      return '75%'
    } else {
      return '100%'
    }
  }, [level])

  return (
    <Box padding={[2 * GU, 2 * GU, 2 * GU, 4 * GU]}>
      <div
        css={`
          position: absolute;
          left: 0;
          top: 0;
          width: ${1.5 * GU}px;
          height: 100%;
          background: linear-gradient(
            90deg,
            ${backgroundColor} 2.32%,
            ${color(backgroundColor).alpha(0)} 88.51%
          );
          border-radius: ${1 * GU}px 0px 0px ${1 * GU}px;
        `}
      />
      <div
        css={`
          display: flex;
          justify-content: space-between;
          align-items: center;
        `}
      >
        <h3
          css={`
            ${textStyle('title3')}
          `}
        >
          {usagePercentage}&nbsp;
          <span
            css={`
              ${textStyle('body3')}
            `}
          >
            of {maxRelays} relays
          </span>
        </h3>
        <Switch checked={checked} onChange={onChange} />
      </div>
    </Box>
  )
}

interface InlineProps {
  children: React.ReactNode
}

function Inline({ children }: InlineProps) {
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')

  return (
    <div
      css={`
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        max-width: ${66 * GU}px;
        margin: 0 auto;
        ${compactMode &&
        `
          flex-direction: column;
          align-items: ${compactMode ? `center` : `flex-start`};
        `}
      `}
    >
      {children}
    </div>
  )
}

const Title = Styled.h3`
  width: 100%;
  ${textStyle('body3')}
  text-align: center;
`

const CenteredContainer = Styled.span`
  display: block;
  ${textStyle('title3')}
  font-weight: 700;
`

const GraphContainer = Styled.div`
  display: flex;
  flex-direction: column;
`

const Stack = Styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`
