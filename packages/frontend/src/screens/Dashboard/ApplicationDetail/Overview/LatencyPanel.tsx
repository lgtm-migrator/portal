import { BarChart, textStyle, useTheme } from '@pokt-foundation/ui'
import 'styled-components/macro'
import Box from '../../../../components/Box/Box'

interface LatencyPanelProps {
  avgLatency: number
  chartLabels: string[]
  chartLines: { id: number; values: number[] }[]
  chartScales: { label: number | string }[]
}

export default function LatencyPanel({
  avgLatency,
  chartLabels,
  chartLines,
  chartScales,
}: LatencyPanelProps) {
  const theme = useTheme()

  return (
    <Box>
      <div
        css={`
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        `}
      >
        <h3
          css={`
            ${textStyle('title2')}
          `}
        >
          AVG Latency
        </h3>
        <p
          css={`
            ${textStyle('body1')}
          `}
        >
          {(avgLatency * 1000).toFixed(0)}ms
        </p>
      </div>
      <div>
        <BarChart
          lines={chartLines}
          label={chartLabels}
          height={200}
          color={() => theme.accentAlternative}
          scales={chartScales}
        />
      </div>
    </Box>
  )
}
