import React from 'react'
import { useTheme, GU, Link } from '@pokt-foundation/ui'
import Card from '../Card/Card'
import PoktScanLogo from '../../assets/poktscanLogo.png'
import { PoktScanLatestBlockAndPerformanceData } from '../../hooks/network-hooks'

const numbersFormatter = Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

interface PerformanceProps {
  isPoktScanLatestBlockAndPerformanceLoading: boolean
  isPoktScanLatestBlockAndPerformanceError: boolean
  latestBlockAndPerformance: PoktScanLatestBlockAndPerformanceData
}

export default function Performance({
  isPoktScanLatestBlockAndPerformanceError,
  latestBlockAndPerformance,
  isPoktScanLatestBlockAndPerformanceLoading,
}: PerformanceProps) {
  const theme = useTheme()

  if (isPoktScanLatestBlockAndPerformanceError) {
    return null
  }

  if (isPoktScanLatestBlockAndPerformanceLoading) {
    return null
  }

  if (!latestBlockAndPerformance?.getRelaysPerformance) {
    return null
  }

  return (
    <Card
      css={`
        padding: ${3 * GU}px;
      `}
    >
      <h3
        css={`
          margin-bottom: ${3 * GU}px;
          font-size: ${GU * 2 + 2}px;
          font-weight: 700;
        `}
      >
        Performance
      </h3>
      <h4
        css={`
          font-size: ${2 * GU}px;
          color: ${theme.accentAlternative};
          font-weight: 700;
          margin-bottom: ${2 * GU}px;
        `}
      >
        Relays
      </h4>

      <div
        css={`
          display: flex;
          justify-content: space-between;
          width: 100%;
        `}
      >
        <Column
          description="Today"
          data={`${numbersFormatter.format(
            latestBlockAndPerformance?.getRelaysPerformance.today_relays
          )}`}
        />
        <Column
          description="Month"
          data={`${numbersFormatter.format(
            latestBlockAndPerformance?.getRelaysPerformance
              .thirty_day_relays_avg
          )}`}
        />
        <Column
          description="Max"
          data={`${numbersFormatter.format(
            latestBlockAndPerformance?.getRelaysPerformance.max_relays
          )}`}
        />
      </div>
      <div
        css={`
          display: flex;
          justify-content: end;
          align-items: center;
          margin-top: ${2 * GU}px;
        `}
      >
        <p
          css={`
            font-size: ${GU}px;
            color: ${theme.disabledContent};
          `}
        >
          POWERED BY
        </p>
        <Link href="https://poktscan.com/" external rel="noreferrer">
          <img src={PoktScanLogo} alt="Poktscan" />
        </Link>
      </div>
    </Card>
  )
}

interface ColumnProps {
  description: string
  data: string
}

function Column({ data, description }: ColumnProps) {
  const theme = useTheme()

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
      `}
    >
      <h5
        css={`
          color: ${theme.placeholder};
        `}
      >
        {description}
      </h5>
      <p
        css={`
          color: ${theme.inactive};
          font-size: ${GU + 6}px;
          font-weight: 600;
        `}
      >
        {data}
      </p>
    </div>
  )
}
