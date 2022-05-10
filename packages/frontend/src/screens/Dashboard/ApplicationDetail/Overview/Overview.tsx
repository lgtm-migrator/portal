import { useCallback, useMemo, useState } from 'react'
import { useHistory, useParams, useRouteMatch } from 'react-router'
import { useMutation } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import { useViewport } from 'use-viewport'
import {
  UserLB,
  UserLBDailyRelayBucket,
  UserLBLatencyBucket,
} from '@pokt-foundation/portal-types'
import * as Sentry from '@sentry/react'
import 'styled-components/macro'
import {
  Banner,
  Button,
  ButtonBase,
  GU,
  Link,
  Spacer,
  Split,
  useTheme,
} from '@pokt-foundation/ui'
import { RemoveAppModal } from './ActionModals'
import EndpointDetails from './EndpointDetails'
import GatewayPanel, { AddressPanel } from './GatewayPanel'
import LatencyPanel from './LatencyPanel'
import SuccessPanel from './SuccessPanel'
import UsagePanel from './UsagePanel'
import UsagePerOrigin from './UsagePerOrigin'
import FloatUp from '../../../../components/FloatUp/FloatUp'
import {
  formatDailyRelaysForGraphing,
  formatLatencyValuesForGraphing,
} from '../application-utils'
import env from '../../../../environment'
// @ts-ignore
import { ReactComponent as Delete } from '../../../../assets/delete.svg'
import { AmplitudeEvents } from '../../../../lib/analytics'
import FeedbackBox from '../../../../components/FeedbackBox/FeedbackBox'

const LATENCY_UPPER_BOUND = 1.25 // 1.25 seconds
const SESSIONS_PER_DAY = 24

interface OverviewProps {
  appData: UserLB
  currentSessionRelays: number
  dailyRelays: UserLBDailyRelayBucket[]
  hourlyLatency: UserLBLatencyBucket[]
  maxDailyRelays: number
  previousRelays: number
  previousSuccessfulRelays: number
  stakedTokens?: number
  successfulRelays: number
  totalRelays: number
}

type UseMetricValuesProps = Omit<OverviewProps, 'appData'>

function useMetricValues({
  currentSessionRelays,
  dailyRelays,
  hourlyLatency,
  maxDailyRelays,
  previousRelays,
  previousSuccessfulRelays,
  successfulRelays,
  totalRelays,
}: UseMetricValuesProps) {
  const successRate = useMemo(() => {
    return totalRelays === 0 ? 0 : successfulRelays / totalRelays
  }, [successfulRelays, totalRelays])
  const previousSuccessRate = useMemo(() => {
    return previousSuccessfulRelays === 0
      ? 0
      : previousSuccessfulRelays / previousRelays
  }, [previousSuccessfulRelays, previousRelays])

  const {
    labels: usageLabels = [],
    lines: usageLines = [],
    scales: usageScales,
  } = useMemo(
    () => formatDailyRelaysForGraphing(dailyRelays, maxDailyRelays),
    [maxDailyRelays, dailyRelays]
  )

  const {
    labels: latencyLabels = [],
    barValues = [],
    scales: latencyScales = [],
  } = useMemo(
    () => formatLatencyValuesForGraphing(hourlyLatency, LATENCY_UPPER_BOUND),
    [hourlyLatency]
  )

  const avgLatency = useMemo(() => {
    if (!hourlyLatency?.length) {
      return 0
    }
    return (
      hourlyLatency.reduce((avg, { latency }) => {
        return avg + latency
      }, 0) / hourlyLatency.length
    )
  }, [hourlyLatency])

  const exceedsMaxRelays = useMemo(() => {
    return totalRelays >= maxDailyRelays
  }, [maxDailyRelays, totalRelays])

  const exceedsSessionRelays = useMemo(() => {
    return currentSessionRelays >= maxDailyRelays / 24
  }, [currentSessionRelays, maxDailyRelays])

  return {
    avgLatency,
    barValues,
    exceedsMaxRelays,
    exceedsSessionRelays,
    latencyLabels,
    latencyScales,
    previousSuccessRate,
    successRate,
    usageLabels,
    usageLines,
    usageScales,
  }
}

export default function Overview({
  appData,
  currentSessionRelays,
  dailyRelays,
  hourlyLatency,
  maxDailyRelays,
  previousRelays,
  previousSuccessfulRelays,
  stakedTokens,
  successfulRelays,
  totalRelays,
}: OverviewProps) {
  const [removeModalVisible, setRemoveModalVisible] = useState(false)
  const history = useHistory()
  const { url } = useRouteMatch()
  const { appId } = useParams<{ appId: string }>()
  const { within } = useViewport()
  const theme = useTheme()
  const { mutate: onRemoveApp } = useMutation(async function removeApp() {
    try {
      const path = `${env('BACKEND_URL')}/api/lb/remove/${appId}`

      await axios.post(path, {}, { withCredentials: true })

      if (env('PROD')) {
        amplitude.getInstance().logEvent(AmplitudeEvents.EndpointRemoval, {
          endpointId: appId,
        })
      }

      history.push('/home')
    } catch (err) {
      Sentry.captureException(err)
    }
  })
  const {
    avgLatency,
    barValues,
    exceedsSessionRelays,
    exceedsMaxRelays,
    latencyLabels,
    latencyScales,
    previousSuccessRate,
    successRate,
    usageLabels,
    usageLines,
    usageScales,
  } = useMetricValues({
    currentSessionRelays,
    dailyRelays,
    hourlyLatency,
    maxDailyRelays,
    previousRelays,
    previousSuccessfulRelays,
    successfulRelays,
    totalRelays,
  })

  const compactMode = within(-1, 'medium')
  const { gigastake, id: appID } = appData

  const onCloseRemoveModal = useCallback(() => setRemoveModalVisible(false), [])

  const onOpenRemoveModal = useCallback(() => setRemoveModalVisible(true), [])

  return (
    <FloatUp
      content={() => (
        <>
          <Split
            primary={
              <>
                {compactMode && (
                  <>
                    <NavigationOptions baseUrl={url} />
                    <Spacer size={3 * GU} />
                  </>
                )}
                <EndpointDetails appData={appData} />
                <Spacer size={3 * GU} />
                {exceedsSessionRelays || exceedsMaxRelays ? (
                  <div
                    css={`
                      ${compactMode &&
                      `
                    > div {
                      > div {
                        > div {
                          height: ${2 * GU}px;
                        }
                      }
                    }
                  `}
                    `}
                  >
                    <Banner
                      mode="warning"
                      title="It's time to up your stake; your app is over the session limit"
                    >
                      Don't worry, we've got you covered. To maintain service,
                      the Portal automatically redirects all surplus relays to
                      our backup infrastructure. If you want all relays to be
                      served by Pocket Network, you'll need to stake more POKT.
                      Please{' '}
                      <Link href="mailto:sales@pokt.network">
                        contact the team
                      </Link>{' '}
                      for further assistance.
                    </Banner>
                    <Spacer size={3 * GU} />
                  </div>
                ) : null}
                <div
                  css={`
                    width: 100%;
                    height: ${compactMode ? 'auto' : `${32 * GU}px`};
                    display: grid;
                    grid-template-columns: ${compactMode ? '1fr' : '1fr 1fr'};
                    grid-column-gap: ${4 * GU}px;
                  `}
                >
                  <SuccessPanel
                    previousSuccessRate={previousSuccessRate}
                    successRate={successRate}
                    totalRequests={totalRelays}
                  />
                  {compactMode && <Spacer size={2 * GU} />}
                  <LatencyPanel
                    avgLatency={avgLatency}
                    chartLabels={latencyLabels}
                    chartLines={barValues}
                    chartScales={latencyScales}
                  />
                </div>
                <Spacer size={3 * GU} />
                <UsagePanel
                  chartLabels={usageLabels}
                  chartLines={usageLines}
                  chartScales={usageScales}
                  maxSessionRelays={maxDailyRelays / SESSIONS_PER_DAY}
                  sessionRelays={currentSessionRelays}
                />
                <Spacer size={3 * GU} />
                <UsagePerOrigin id={appID} />
              </>
            }
            secondary={
              <>
                {!compactMode && (
                  <>
                    <NavigationOptions baseUrl={url} />
                    <Spacer size={3 * GU} />
                  </>
                )}
                <Spacer size={3 * GU} />
                <GatewayPanel
                  id={appData.id}
                  secret={appData.gatewaySettings.secretKey}
                  publicKey={appData.apps[0].publicKey}
                />
                <Spacer size={3 * GU} />
                {!gigastake && <AddressPanel apps={appData.apps} />}
                <Spacer size={2 * GU} />
                <FeedbackBox />
                <Spacer size={2 * GU} />
                <ButtonBase
                  css={`
                    && {
                      margin-left: ${2 * GU}px;
                      height: ${5 * GU}px;
                      color: ${theme.accent};
                      font-weight: bold;
                    }
                  `}
                  onClick={onOpenRemoveModal}
                >
                  <Delete
                    css={`
                      display: inline-block;
                      margin-right: ${1 * GU}px;
                    `}
                  />
                  Remove this application
                </ButtonBase>
              </>
            }
          />
          <RemoveAppModal
            onClose={onCloseRemoveModal}
            onRemove={onRemoveApp}
            visible={removeModalVisible}
          />
        </>
      )}
    />
  )
}

interface NavigationOptions {
  baseUrl: string
}

function NavigationOptions({ baseUrl }: NavigationOptions) {
  const history = useHistory()
  const { within } = useViewport()

  const compactMode = within(-1, 'medium')

  return (
    <>
      {!compactMode && (
        <>
          <Button wide onClick={() => history.push(`${baseUrl}/security`)}>
            App Security
          </Button>
        </>
      )}
      <Spacer size={2 * GU} />
      <Button wide onClick={() => history.push(`${baseUrl}/notifications`)}>
        Notification Setup
      </Button>
    </>
  )
}
