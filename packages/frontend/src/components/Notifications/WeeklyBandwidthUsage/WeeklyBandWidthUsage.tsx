import { useMemo } from 'react'
import {
  Spacer,
  textStyle,
  useTheme,
  GU,
  CircleGraph,
} from '@pokt-foundation/ui'
import { useViewport } from 'use-viewport'
import Styled from 'styled-components/macro'
import Card from '../../Card/Card'
import Inline from '../Inline/Inline'
import { useUsageColor } from '../../../screens/Dashboard/ApplicationDetail/application-utils'
import { UserLBDailyRelayBucket } from 'packages/types/src'
import { formatNumberToSICompact } from '../../../lib/formatting-utils'

const GRAPH_SIZE = 130

interface WeeklyBandwidthUsageProps {
  dailyRelays: UserLBDailyRelayBucket[]
  maxDailyRelays: number
}

export default function WeeklyBandwidthUsage({
  dailyRelays,
  maxDailyRelays,
}: WeeklyBandwidthUsageProps) {
  const theme = useTheme()
  const { within } = useViewport()
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

  const [primaryAverageUsageColor, secondaryAverageUsageColor] = useUsageColor(
    totalDailyRelays / maxDailyRelays
  )
  const [primaryMaxUsageColor, secondaryMaxUsageColor] = useUsageColor(
    highestDailyAmount / maxDailyRelays
  )
  const [primaryMinUsageColor, secondaryMinUsageColor] = useUsageColor(
    lowestDailyAmount / maxDailyRelays
  )

  const maxRelays = formatNumberToSICompact(maxDailyRelays)

  return (
    <Card
      css={`
        padding: ${3 * GU}px;
      `}
    >
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
          Max Relays Per Day: {maxRelays}
        </h3>
      </div>
      <Spacer size={compactMode ? 2 * GU : 5.5 * GU} />
      <Inline>
        <GraphContainer>
          <CircleGraph
            value={Math.min(totalDailyRelays / maxDailyRelays, 1)}
            size={GRAPH_SIZE}
            color="url(#average-usage-gradient)"
            strokeWidth={GU * 2 + 4}
          >
            <defs>
              <linearGradient id="average-usage-gradient">
                <stop
                  offset="10%"
                  stop-opacity="100%"
                  stop-color={secondaryAverageUsageColor}
                />
                <stop
                  offset="90%"
                  stop-opacity="100%"
                  stop-color={primaryAverageUsageColor}
                />
              </linearGradient>
            </defs>
          </CircleGraph>
          <Spacer size={1 * GU} />
          <Stack
            css={`
              display: flex;
              flex-direction: column;
            `}
          >
            <Title
              css={`
                span {
                  color: ${theme.content};
                }
                color: ${theme.placeholder};
              `}
            >
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
            color="url(#max-usage-gradient)"
            strokeWidth={GU * 2 + 4}
          >
            <defs>
              <linearGradient id="max-usage-gradient">
                <stop
                  offset="10%"
                  stop-opacity="100%"
                  stop-color={secondaryMaxUsageColor}
                />
                <stop
                  offset="90%"
                  stop-opacity="100%"
                  stop-color={primaryMaxUsageColor}
                />
              </linearGradient>
            </defs>
          </CircleGraph>
          <Spacer size={1 * GU} />
          <Stack
            css={`
              display: flex;
              flex-direction: column;
            `}
          >
            <Title
              css={`
                span {
                  color: ${theme.content};
                }
                color: ${theme.placeholder};
              `}
            >
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
            color="url(#min-usage-gradient)"
            strokeWidth={GU * 2 + 4}
          >
            <defs>
              <linearGradient id="min-usage-gradient">
                <stop
                  offset="10%"
                  stop-opacity="100%"
                  stop-color={secondaryMinUsageColor}
                />
                <stop
                  offset="90%"
                  stop-opacity="100%"
                  stop-color={primaryMinUsageColor}
                />
              </linearGradient>
            </defs>
          </CircleGraph>
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
                span {
                  color: ${theme.content};
                }
                color: ${theme.placeholder};
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
    </Card>
  )
}

const Title = Styled.h3`
  width: 100%;
  ${textStyle('body3')}
  text-align: center;
`

const CenteredContainer = Styled.span`
  display: block;
  ${textStyle('body2')}
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
