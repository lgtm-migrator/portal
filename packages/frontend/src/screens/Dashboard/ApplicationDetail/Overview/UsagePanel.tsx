import React from 'react'
import { useViewport } from 'use-viewport'
import {
  CircleGraph,
  LineChart,
  Spacer,
  textStyle,
  useTheme,
  GU,
} from '@pokt-foundation/ui'
import 'styled-components/macro'
import { useUsageColor } from '../application-utils'
import Box from '../../../../components/Box/Box'
import { commify } from '../../../../lib/formatting-utils'

interface UsagePanelProps {
  chartLabels: string[]
  chartLines: { id: number; values: number[] }[]
  chartScales: { label: string | number }[]
  maxSessionRelays: number
  sessionRelays: number
}

export default function UsagePanel({
  chartLabels,
  chartLines,
  chartScales,
  maxSessionRelays,
  sessionRelays,
}: UsagePanelProps) {
  const [primaryUsageColor, secondaryUsageColor] = useUsageColor(
    sessionRelays / maxSessionRelays
  )
  const theme = useTheme()
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')

  return (
    <Box>
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
            ${!compactMode && `border-right: 1px solid ${theme.background};`}
            ${compactMode &&
            `border-bottom: 1px solid ${theme.background}; padding-bottom: ${
              1 * GU
            }px;`}
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
                display: block;
                ${textStyle('body2')}
                font-weight: 400;
              `}
            >
              Relays this session
            </span>
            <Spacer size={1 * GU} />
            <span
              css={`
                display: block;
                ${textStyle('body2')}
                font-weight: 400;
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
            threshold
            scales={chartScales}
          />
        </div>
      </div>
    </Box>
  )
}
