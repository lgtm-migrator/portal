import React, { useMemo } from 'react'
import { useTheme, GU, Link } from '@pokt-foundation/ui'
import Card from '../Card/Card'
import PoktScanLogo from '../../assets/poktscanLogo.png'
import { PoktScanLatestBlockAndPerformanceData } from '../../hooks/network-hooks'

interface LatestBlockProps {
  isPoktScanLatestBlockAndPerformanceLoading: boolean
  isPoktScanLatestBlockAndPerformanceError: boolean
  latestBlockAndPerformance: PoktScanLatestBlockAndPerformanceData
}

function appendZeroToTime(time: string) {
  return time.length < 2 ? `0${time}` : time
}

export default function LatestBlock({
  isPoktScanLatestBlockAndPerformanceError,
  isPoktScanLatestBlockAndPerformanceLoading,
  latestBlockAndPerformance,
}: LatestBlockProps) {
  const theme = useTheme()
  const blockProducedDateInLocalTime = useMemo(() => {
    const blockProducedTimeInDate = new Date(
      latestBlockAndPerformance?.highestBlock.item.time
    )
    const hours = appendZeroToTime(
      blockProducedTimeInDate.getHours().toLocaleString()
    )
    const minutes = appendZeroToTime(
      blockProducedTimeInDate.getMinutes().toLocaleString()
    )

    return `${hours}:${minutes} ${
      Intl.DateTimeFormat().resolvedOptions().timeZone
    }`
  }, [latestBlockAndPerformance])

  if (isPoktScanLatestBlockAndPerformanceError) {
    return null
  }

  if (isPoktScanLatestBlockAndPerformanceLoading) {
    return null
  }

  if (!latestBlockAndPerformance?.highestBlock) {
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
        Latest Block
      </h3>
      <Row
        description="Block"
        data={`${latestBlockAndPerformance?.highestBlock.item.height}`}
        css={`
          span:nth-of-type(2) {
            color: ${theme.accentAlternative};
          }
        `}
      />
      <Row description="Time" data={blockProducedDateInLocalTime} />
      <Row
        description="Relays"
        data={`${latestBlockAndPerformance?.highestBlock.item.total_relays_completed.toLocaleString()}`}
      />
      <Row
        description="Txs"
        data={`${latestBlockAndPerformance?.highestBlock.item.total_txs.toLocaleString()}`}
      />
      <Row
        description="Produced in"
        data={`${latestBlockAndPerformance?.highestBlock.item.took.toFixed(
          2
        )} min`}
      />
      <Row
        description="Validator Threshold"
        data={`${latestBlockAndPerformance?.highestBlock.validatorThreshold.toLocaleString()}`}
      />
      <div
        css={`
          display: flex;
          justify-content: end;
          align-items: center;
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

interface RowProps {
  description: string
  data: string
}

function Row({ description, data, ...props }: RowProps) {
  const theme = useTheme()

  return (
    <div
      css={`
        display: flex;
        width: 100%;
        justify-content: space-between;
        margin-bottom: ${2 * GU}px;
      `}
      {...props}
    >
      <span
        css={`
          color: ${theme.placeholder};
          font-size: ${GU + 6}px;
          font-weight: 500;
        `}
      >
        {description}
      </span>
      <span
        css={`
          color: ${theme.inactive};
          font-size: ${GU + 6}px;
          font-weight: 600;
        `}
      >
        {data}
      </span>
    </div>
  )
}
