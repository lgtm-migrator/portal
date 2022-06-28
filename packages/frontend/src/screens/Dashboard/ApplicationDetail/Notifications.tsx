import { useCallback, useMemo, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import { useViewport } from 'use-viewport'
import { UserLB } from '@pokt-foundation/portal-types'
import {
  Link,
  Spacer,
  Split,
  textStyle,
  useToast,
  GU,
} from '@pokt-foundation/ui'
import * as Sentry from '@sentry/react'
import FloatUp from '../../../components/FloatUp/FloatUp'
import { log } from '../../../lib/utils'
import env from '../../../environment'
import {
  KNOWN_MUTATION_SUFFIXES,
  KNOWN_QUERY_SUFFIXES,
} from '../../../known-query-suffixes'
import { sentryEnabled } from '../../../sentry'
import { UserLBDailyRelayBucket } from 'packages/types/src'
import { AmplitudeEvents } from '../../../lib/analytics'
import FeedbackBox from '../../../components/FeedbackBox/FeedbackBox'
import NavigationOptions from '../../../components/Notifications/NavigationOptions/NavigationOptions'
import WeeklyBandwidthUsage from '../../../components/Notifications/WeeklyBandwidthUsage/WeeklyBandWidthUsage'
import Alerts from '../../../components/Notifications/Alerts/Alerts'
import { useAuthHeaders } from '../../../hooks/useAuthHeaders'

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
  const headers = useAuthHeaders()
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
          await headers
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
                  ${textStyle('body3')}
                `}
              >
                Set up usage alerts to be warned when you are approaching your
                relay limits. The Portal automatically redirects all surplus
                relays to our backup infrastructure. If you want all relays to
                be unstoppable, stay under your limit or contact the team to up
                your stake.
              </p>
              <Spacer size={2 * GU} />
              <WeeklyBandwidthUsage
                dailyRelays={dailyRelays}
                maxDailyRelays={maxDailyRelays}
              />
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
              <Alerts
                chosenPercentages={chosenPercentages}
                maxDailyRelays={maxDailyRelays}
                onChosePercentageChange={onChosePercentageChange}
              />
              <Spacer size={2 * GU} />
              <FeedbackBox />
            </>
          }
        />
      )}
    />
  )
}
