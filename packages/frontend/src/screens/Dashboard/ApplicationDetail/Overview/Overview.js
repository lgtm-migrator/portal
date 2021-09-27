import React, { useCallback, useMemo, useState } from 'react'
import { useHistory, useParams, useRouteMatch } from 'react-router'
import { useMutation } from 'react-query'
import axios from 'axios'
import * as dayjs from 'dayjs'
import * as dayJsutcPlugin from 'dayjs/plugin/utc'
import { useViewport } from 'use-viewport'
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
import {
  RemoveAppModal,
  SwitchDenialModal,
  SwitchInfoModal,
} from './ActionModals'
import EndpointDetails from './EndpointDetails'
import GatewayPanel, { AddressPanel } from './GatewayPanel'
import LatencyPanel from './LatencyPanel'
import SuccessPanel from './SuccessPanel'
import UsagePanel from './UsagePanel'
import UsagePerOrigin from './UsagePerOrigin'
import AppStatus from '../../../../components/AppStatus/AppStatus'
import FloatUp from '../../../../components/FloatUp/FloatUp'
import {
  formatDailyRelaysForGraphing,
  formatLatencyValuesForGraphing,
} from '../application-utils'
import { trackEvent } from '../../../../lib/analytics'
import env from '../../../../environment'
import { ReactComponent as Delete } from '../../../../assets/delete.svg'

const LATENCY_UPPER_BOUND = 1.25 // 1.25 seconds
const SESSIONS_PER_DAY = 24

function useMetricValues({
  appData,
  currentSessionRelays,
  dailyRelays,
  hourlyLatency,
  maxDailyRelays,
  previousRelays,
  previousSuccessfulRelays,
  successfulRelays,
  totalRelays,
}) {
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

  const isSwitchable = useMemo(() => {
    dayjs.extend(dayJsutcPlugin)
    const today = dayjs.utc()
    const appLastUpdated = dayjs.utc(appData.updatedAt ?? appData.createdAt)

    const diff = today.diff(appLastUpdated, 'day')

    return diff >= 7
  }, [appData])

  const exceedsMaxRelays = useMemo(() => {
    if (!hourlyLatency) {
      return false
    }
    const todaysRelays = hourlyLatency[hourlyLatency.length - 1] ?? {
      dailyRelays: 0,
    }
    const { dailyRelays = 0 } = todaysRelays

    return dailyRelays >= maxDailyRelays
  }, [hourlyLatency, maxDailyRelays])

  const exceedsSessionRelays = useMemo(() => {
    return currentSessionRelays >= maxDailyRelays / 24
  }, [currentSessionRelays, maxDailyRelays])

  return {
    avgLatency,
    barValues,
    exceedsMaxRelays,
    exceedsSessionRelays,
    isSwitchable,
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
}) {
  const [networkModalVisible, setNetworkModalVisible] = useState(false)
  const [removeModalVisible, setRemoveModalVisible] = useState(false)
  const [networkDenialModalVisible, setNetworkDenialModalVisible] =
    useState(false)
  const history = useHistory()
  const { url } = useRouteMatch()
  const { appId } = useParams()
  const { within } = useViewport()
  const theme = useTheme()
  const { mutate: onRemoveApp } = useMutation(async function removeApp() {
    try {
      const path = `${env('BACKEND_URL')}/api/lb/remove/${appId}`

      await axios.post(path, {}, { withCredentials: true })
      trackEvent('portal_app_revoke', {
        segmentation: {
          appId,
        },
      })

      history.push('/home')
    } catch (err) {
      Sentry.captureException(err)
    }
  })
  const {
    avgLatency,
    barValues,
    exceedsMaxRelays,
    exceedsSessionRelays,
    isSwitchable,
    latencyLabels,
    latencyScales,
    previousSuccessRate,
    successRate,
    usageLabels,
    usageLines,
    usageScales,
  } = useMetricValues({
    appData,
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
  const { id: appID } = appData

  const onCloseDenialModal = useCallback(
    () => setNetworkDenialModalVisible(false),
    []
  )
  const onCloseNetworkModal = useCallback(
    () => setNetworkModalVisible(false),
    []
  )
  const onCloseRemoveModal = useCallback(() => setRemoveModalVisible(false), [])

  const onOpenModal = useCallback(() => {
    if (isSwitchable) {
      setNetworkModalVisible(true)
    } else {
      setNetworkDenialModalVisible(true)
    }
  }, [isSwitchable])
  const onOpenRemoveModal = useCallback(() => setRemoveModalVisible(true), [])

  const onSwitchChains = useCallback(() => {
    history.push(`${url}/chains`)
  }, [history, url])

  return (
    <FloatUp
      content={() => (
        <>
          <Split
            primary={
              <>
                {compactMode && (
                  <>
                    <NavigationOptions
                      baseUrl={url}
                      onOpenModal={onOpenModal}
                    />
                    <Spacer size={3 * GU} />
                  </>
                )}
                <EndpointDetails appData={appData} />
                <Spacer size={3 * GU} />
                {exceedsMaxRelays && (
                  <>
                    <Banner
                      mode="warning"
                      title="It's time to up your stake; your app is over the daily limit"
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
                    <Spacer size={2 * GU} />
                  </>
                )}
                {!exceedsMaxRelays && exceedsSessionRelays && (
                  <>
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
                  </>
                )}
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
                <UsagePerOrigin id={appID} maxRelays={maxDailyRelays} />
              </>
            }
            secondary={
              <>
                {!compactMode && (
                  <>
                    <NavigationOptions
                      baseUrl={url}
                      onOpenModal={onOpenModal}
                    />
                    <Spacer size={3 * GU} />
                  </>
                )}
                <AppStatus
                  maxDailyRelays={maxDailyRelays}
                  stakedTokens={stakedTokens}
                />
                <Spacer size={3 * GU} />
                <GatewayPanel
                  apps={appData.apps}
                  id={appData.id}
                  secret={appData.gatewaySettings.secretKey}
                />
                <Spacer size={3 * GU} />
                <AddressPanel apps={appData.apps} />
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
          <SwitchInfoModal
            onClose={onCloseNetworkModal}
            onSwitch={onSwitchChains}
            visible={networkModalVisible}
          />
          <RemoveAppModal
            onClose={onCloseRemoveModal}
            onRemove={onRemoveApp}
            visible={removeModalVisible}
          />
          <SwitchDenialModal
            onClose={onCloseDenialModal}
            visible={networkDenialModalVisible}
          />
        </>
      )}
    />
  )
}

function NavigationOptions({ baseUrl, onOpenModal }) {
  const history = useHistory()
  const { within } = useViewport()

  const compactMode = within(-1, 'medium')

  return (
    <>
      {!compactMode && (
        <>
          <Button mode="strong" wide onClick={onOpenModal}>
            Switch chains
          </Button>
          <Spacer size={2 * GU} />
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
