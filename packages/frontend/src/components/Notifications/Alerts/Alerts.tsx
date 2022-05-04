import { Spacer, textStyle, GU } from '@pokt-foundation/ui'
import Card from '../../Card/Card'
import NotificationPreference from '../NotificationPreference/NotificationPreference'
import { INotificationSettings } from 'packages/types/src'
import { formatNumberToSICompact } from '../../../lib/formatting-utils'

interface AlertsProps {
  chosenPercentages: INotificationSettings
  maxDailyRelays: number
  onChosePercentageChange: (percentage: string) => void
}

export default function Alerts({
  chosenPercentages,
  maxDailyRelays,
  onChosePercentageChange,
}: AlertsProps) {
  const maxRelays = formatNumberToSICompact(maxDailyRelays)

  return (
    <>
      <Card
        css={`
          padding: ${3 * GU}px;
        `}
      >
        <h3
          css={`
            margin-bottom: ${2 * GU}px;
          `}
        >
          Activate Alerts
        </h3>
        <p
          css={`
            ${textStyle('body2')}
          `}
        >
          We will send an email when your usage crosses the thresholds specified
          below.
        </p>
      </Card>
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
  )
}
