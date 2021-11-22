import React, { useMemo } from 'react'
import { useViewport } from 'use-viewport'
import { DataView, Link, textStyle, GU } from '@pokt-foundation/ui'
import Box from '../../../../components/Box/Box'
import { useOriginClassification } from '../../../../hooks/application-hooks'
import 'styled-components/macro'

const HIGHLIGHT_COLORS = ['#D27E31', '#55B02B', '#BB31D2', '#31ABD2', '#D2CC31']

export default function UsagePerOrigin({ id, maxRelays }) {
  const { within } = useViewport()
  const { isLoading, originData } = useOriginClassification({
    id,
  })

  const compactMode = within(-1, 'medium')

  const usagePerOrigin = useMemo(() => {
    if (!originData) {
      return []
    }
    return originData
  }, [originData])

  const totalRelays = usagePerOrigin.reduce((acc, { count = 0 }) => {
    return acc + count
  }, 0)

  const processedOriginClassification = useMemo(() => {
    return usagePerOrigin.map(({ origin, count }) => ({
      origin,
      count,
      percentage: count / totalRelays,
    }))
  }, [usagePerOrigin, totalRelays])

  return (
    <Box
      title="Usage by Origin"
      css={`
        padding-bottom: ${4 * GU}px;
      `}
    >
      <DataView
        mode={compactMode ? 'list' : 'table'}
        fields={[{ label: 'Origin' }, { label: 'Relays' }]}
        status={isLoading ? 'loading' : 'default'}
        entries={processedOriginClassification}
        renderEntry={({ origin, count, percentage }, index) => {
          return [
            <div
              css={`
                display: flex;
                flex-direction: column;
              `}
            >
              <p
                css={`
                  display: inline-block;
                  overflow: hidden;
                  white-space: nowrap;
                  text-overflow: ellipsis;
                `}
              >
                {origin ? (
                  <Link
                    href={origin}
                    css={`
                      && {
                        max-width: ${!compactMode ? 40 * GU : 25 * GU}px;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        color: white;
                      }
                    `}
                  >
                    {origin}
                  </Link>
                ) : (
                  'Unknown'
                )}
              </p>
              <div
                css={`
                  display: flex;
                  align-items: center;
                `}
              >
                <p
                  css={`
                    ${textStyle('body4')}
                    color: ${HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length]};
                  `}
                >
                  {percentage.toFixed(2)}%
                </p>
                &nbsp;
                <div
                  css={`
                    width: ${200 * percentage}px;
                    height: ${GU / 2}px;
                    background: ${HIGHLIGHT_COLORS[
                      index % HIGHLIGHT_COLORS.length
                    ]};
                  `}
                />
              </div>
            </div>,
            <p>{count}</p>,
          ]
        }}
      />
    </Box>
  )
}
