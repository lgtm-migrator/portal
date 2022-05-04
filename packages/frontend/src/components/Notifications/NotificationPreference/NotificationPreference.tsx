import { useMemo } from 'react'
import { Switch, textStyle, useTheme, GU } from '@pokt-foundation/ui'
import Card from '../../Card/Card'

interface NotificationPreferenceProps {
  level: string
  checked: boolean
  onChange: () => void
  maxRelays: string
}

export default function NotificationPreference({
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
    <Card
      css={`
        padding: ${2 * GU}px ${2 * GU}px ${2 * GU}px ${4 * GU}px;
        position: relative;
      `}
    >
      <div
        css={`
          position: absolute;
          left: 0;
          top: 0;
          width: ${GU}px;
          height: 100%;
          background: ${backgroundColor};
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
            ${textStyle('title2')}
          `}
        >
          {usagePercentage}&nbsp;
          <span
            css={`
              ${textStyle('body3')}
            `}
          >
            of {maxRelays} relays per day
          </span>
        </h3>
        <Switch checked={checked} onChange={onChange} />
      </div>
    </Card>
  )
}
