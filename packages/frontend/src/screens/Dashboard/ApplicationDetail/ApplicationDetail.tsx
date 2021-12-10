import { useMemo } from 'react'
import { Switch, Route, useParams, useRouteMatch } from 'react-router'
import 'styled-components/macro'
import { Spacer, textStyle, GU } from '@pokt-foundation/ui'
import AnimatedLogo from '../../../components/AnimatedLogo/AnimatedLogo'
import Chains from '../../Dashboard/ApplicationDetail/Chains'
import Notifications from '../../Dashboard/ApplicationDetail/Notifications'
import Overview from '../../Dashboard/ApplicationDetail/Overview/Overview'
import Security from '../../Dashboard/ApplicationDetail/Security'
import SuccessDetails from '../../Dashboard/ApplicationDetail/SuccessDetails'
import { useAppMetrics } from '../../../hooks/useAppMetrics'
import { useUserApps } from '../../../contexts/AppsContext'
import { ILBInfo } from '../../../hooks/application-hooks'

export default function AppDetailWrapper() {
  const { appsLoading, userApps } = useUserApps()
  const { appId } = useParams<{ appId: string }>()

  const activeApplication = useMemo(
    () => userApps.find((app) => appId === app.id),
    [appId, userApps]
  )

  if (appsLoading || !activeApplication) {
    return <AnimatedLoader />
  }

  return <ApplicationDetail activeApplication={activeApplication} />
}

interface ApplicationDetailProps {
  activeApplication: ILBInfo
}

function ApplicationDetail({ activeApplication }: ApplicationDetailProps) {
  const { path } = useRouteMatch()
  const { metricsLoading, metrics } = useAppMetrics({
    activeApplication,
  })
  const [
    { data: totalRelaysData },
    { data: successfulRelaysData },
    { data: dailyRelayData },
    { data: sessionRelayData },
    { data: previousSuccessfulRelayData },
    { data: previousRangedRelayData },
    { data: hourlyLatencyData },
    { data: appOnChainData },
  ] = metrics

  const sessionRelayDep = JSON.stringify(sessionRelayData)
  const dailyRelaysDep = JSON.stringify(dailyRelayData)
  const previousSuccessfulRelaysDep = JSON.stringify(
    previousSuccessfulRelayData
  )
  const previousRangedRelaysDep = JSON.stringify(previousRangedRelayData)
  const successfulRelaysDep = JSON.stringify(successfulRelaysData)
  const totalRelaysDep = JSON.stringify(totalRelaysData)
  const hourlyLatencyDep = JSON.stringify(hourlyLatencyData)
  const appOnChainDep = JSON.stringify(appOnChainData)

  const currentSessionRelays = useMemo(
    () => sessionRelayData?.session_relays ?? 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionRelayDep]
  )

  const dailyRelays = useMemo(
    () => dailyRelayData?.daily_relays ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dailyRelaysDep]
  )
  const previousSuccessfulRelays = useMemo(
    () => previousSuccessfulRelayData?.successful_relays ?? 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previousSuccessfulRelaysDep]
  )
  const previousRangedRelays = useMemo(
    () => previousRangedRelayData?.total_relays ?? 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previousRangedRelaysDep]
  )
  const totalRelays = useMemo(
    () => totalRelaysData?.total_relays ?? 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalRelaysDep]
  )
  const successfulRelays = useMemo(
    () => successfulRelaysData?.total_relays ?? 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [successfulRelaysDep]
  )
  const hourlyLatency = useMemo(
    () => hourlyLatencyData?.hourly_latency ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hourlyLatencyDep]
  )
  const { stakedTokens, maxDailyRelays } = useMemo(() => {
    return {
      stakedTokens: appOnChainData?.stake ?? 0n,
      maxDailyRelays: Number(appOnChainData?.relays ?? 0) * 24 ?? 0n,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appOnChainDep])

  return metricsLoading ? (
    <AnimatedLoader />
  ) : (
    <Switch>
      <Route exact path={path}>
        <Overview
          appData={activeApplication}
          currentSessionRelays={currentSessionRelays}
          dailyRelays={dailyRelays}
          hourlyLatency={hourlyLatency}
          maxDailyRelays={maxDailyRelays}
          previousRelays={previousRangedRelays}
          previousSuccessfulRelays={previousSuccessfulRelays}
          stakedTokens={stakedTokens}
          successfulRelays={successfulRelays}
          totalRelays={totalRelays}
        />
      </Route>
      <Route path={`${path}/security`}>
        <Security
          appData={activeApplication}
          maxDailyRelays={maxDailyRelays}
          stakedTokens={stakedTokens}
        />
      </Route>
      <Route path={`${path}/success-details`}>
        <SuccessDetails
          id={activeApplication.id}
          isLb={activeApplication.isLb}
          maxDailyRelays={maxDailyRelays}
          stakedTokens={stakedTokens}
          successfulRelays={successfulRelays}
          totalRelays={totalRelays}
        />
      </Route>
      <Route path={`${path}/notifications`}>
        <Notifications
          appData={activeApplication}
          dailyRelays={dailyRelays}
          maxDailyRelays={maxDailyRelays}
        />
      </Route>
      <Route path={`${path}/chains`}>
        <Chains appData={activeApplication} />
      </Route>
    </Switch>
  )
}

function AnimatedLoader() {
  return (
    <div
      css={`
        position: relative;
        width: 100%;
        /* TODO: This is leaky. fix up with a permanent component */
        height: 70vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `}
    >
      <AnimatedLogo />
      <Spacer size={2 * GU} />
      <p
        css={`
          ${textStyle('body2')}
        `}
      >
        Loading application...
      </p>
    </div>
  )
}
