import { BarChart, textStyle, useTheme, GU } from '@pokt-foundation/ui'
import 'styled-components/macro'
import Card from '../../../../components/Card/Card'

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
    <Card
      css={`
        padding: ${3 * GU}px;
      `}
    >
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
    </Card>
  )
}
