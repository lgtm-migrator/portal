import React, { useMemo } from 'react'
import { useViewport } from 'use-viewport'
import {
  CircleGraph,
  LineChart,
  Spacer,
  textStyle,
  useTheme,
  GU,
  Help,
} from '@pokt-foundation/ui'
import 'styled-components/macro'
import { useUsageColor } from '../application-utils'
import Card from '../../../../components/Card/Card'
import { commify } from '../../../../lib/formatting-utils'
import { UserLBDailyRelayBucket } from '@pokt-foundation/portal-types'

interface UsagePanelProps {
  chartLabels: string[]
  chartLines: { id: number; values: number[] }[]
  chartScales: { label: string | number }[]
  maxSessionRelays: number
  sessionRelays: number
  maxDailyRelays: number
  dailyRelays: UserLBDailyRelayBucket[]
}

export default function UsagePanel({
  chartLabels,
  chartLines,
  chartScales,
  maxSessionRelays,
  sessionRelays,
  maxDailyRelays,
  dailyRelays,
}: UsagePanelProps) {
  const [primaryUsageColor, secondaryUsageColor] = useUsageColor(
    sessionRelays / maxSessionRelays
  )
  const theme = useTheme()
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')

  const highestDailyRelay = useMemo(
    () =>
      dailyRelays.reduce(
        (highest, { daily_relays: totalRelays }) =>
          Math.max(highest, totalRelays),
        0
      ),
    [dailyRelays]
  )
  const displayThreshold = useMemo(
    () => maxDailyRelays <= highestDailyRelay,
    [highestDailyRelay, maxDailyRelays]
  )

  return (
    <Card
      css={`
        padding: ${GU * 3}px;
      `}
    >
      <div
        css={`
          display: flex;
          justify-content: space-between;
        `}
      ></div>
      <div
        css={`
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: 30% 1fr;
          grid-column-gap: ${1 * GU}px;
          ${compactMode && `grid-template-columns: 1fr;`}
        `}
      >
        <div
          css={`
            display: flex;
            flex-direction: column;
            align-items: center;
            grid-column: 1;
          `}
        >
          <h3
            css={`
              ${textStyle('title2')}
              ${compactMode && `margin-top: ${1 * GU}px;`}
            `}
          >
            Current usage
          </h3>
          <Spacer size={5 * GU} />
          <CircleGraph
            value={
              maxSessionRelays === 0
                ? 0
                : Math.min(1, sessionRelays / maxSessionRelays)
            }
            size={120}
            color="url(#current-usage-gradient)"
            strokeWidth={GU * 2 + 4}
          >
            <defs>
              <linearGradient id="current-usage-gradient">
                <stop
                  offset="10%"
                  stop-opacity="100%"
                  stop-color={secondaryUsageColor}
                />
                <stop
                  offset="90%"
                  stop-opacity="100%"
                  stop-color={primaryUsageColor}
                />
              </linearGradient>
            </defs>
          </CircleGraph>
          <Spacer size={4 * GU} />
          <h4
            css={`
              ${textStyle('title2')}
              text-align: center;
            `}
          >
            {commify(sessionRelays.toFixed(0))}
            <Spacer size={GU / 2} />
            <span
              css={`
                display: flex;
                align-items: center;
                ${textStyle('body2')}
                font-weight: 400;
              `}
            >
              Relays this session
              <Help
                placement="right"
                css={`
                  margin-left: ${GU / 2}px;
                `}
              >
                Total number of request sent during the current network session,
                each session has 4 blocks, 15 min each, 1 hour total.
              </Help>
            </span>
            <Spacer size={1 * GU} />
            <span
              css={`
                display: block;
                ${textStyle('body3')}
                font-weight: 400;
                color: ${theme.placeholder};
              `}
            >
              Max {commify(maxSessionRelays * 24)}
            </span>
          </h4>
          {compactMode && <Spacer size={3 * GU} />}
        </div>
        <div
          css={`
            ${!compactMode && `grid-column: 2;`}
          `}
        >
          {compactMode && <Spacer size={3 * GU} />}
          <h3
            css={`
              ${textStyle('title2')}
              ${compactMode && `text-align: center;`}
            `}
          >
            Weekly usage
          </h3>
          <Spacer size={1 * GU} />
          <LineChart
            lines={chartLines}
            label={(i: number) => chartLabels[i]}
            height={300}
            color={() => theme.accentAlternative}
            renderCheckpoints
            dotRadius={GU}
            threshold={displayThreshold}
            scales={chartScales}
            dotColor={theme.accent}
            renderVerticalCheckLines
            renderBackground
            css={`
              circle {
                filter: drop-shadow(0px 0px 4px rgba(197, 236, 75, 0.3));
              }

              path {
                stroke-width: 5;
              }
            `}
          />
        </div>
      </div>
    </Card>
  )
}
