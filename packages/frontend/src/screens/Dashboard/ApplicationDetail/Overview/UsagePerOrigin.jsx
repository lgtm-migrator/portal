import React, { useMemo } from 'react'
import { useViewport } from 'use-viewport'
import { DataView, Link, textStyle, GU, useTheme } from '@pokt-foundation/ui'
import Card from '../../../../components/Card/Card'
import { useOriginClassification } from '../../../../hooks/application-hooks'
import 'styled-components/macro'

export default function UsagePerOrigin({ id }) {
  const { within } = useViewport()
  const { isLoading, originData } = useOriginClassification({
    id,
  })
  const theme = useTheme()
  const HIGHLIGHT_COLORS = useMemo(
    () => [theme.accent, theme.accentAlternative],
    [theme.accent, theme.accentAlternative]
  )

  const emptyState = useMemo(() => {
    return {
      default: {
        displayLoader: false,
        title: (
          <h2
            css={`
              color: ${theme.placeholder};
              font-size: ${GU * 2}px;
              font-weight: 400;
              white-space: nowrap;
            `}
          >
            You don't have any data available yet.
          </h2>
        ),
        subtitle: null,
        illustration: <img src="empty-state-illustration-blue.png" alt="" />,
        clearLabel: null,
      },
      loading: {
        displayLoader: true,
        title: 'Loading data',
        subtitle: null,
        illustration: <img src="empty-state-illustration-blue.png" alt="" />,
        clearLabel: null,
      },
      'empty-filters': {
        displayLoader: false,
        title: 'No results found.',
        subtitle: 'We cannot find any item matching your filter selection.',
        clearLabel: 'Clear filters',
      },
      'empty-search': {
        displayLoader: false,
        title: 'No results found.',
        subtitle: 'We cannot find any item matching your search query.',
        clearLabel: 'Clear filters',
      },
    }
  }, [theme.placeholder])

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
    <Card
      css={`
          padding ${GU * 3}px;
          margin-bottom: ${GU * 11}px;

          table thead th {
            height: 0;
            padding: 0;
            border: none;
          }

          table tbody tr td {
            border: none;
          }

          table + div {
            border: none;
          }
        `}
    >
      <h2
        css={`
              margin: 0  0 ${GU * 3}px ${GU * 3}px;
              font-size: ${GU * 2 + 2}px;
              font-weight: 700;
              color:: ${theme.inactive};
            `}
      >
        Usage by Origin
      </h2>
      <>
        <DataView
          mode={compactMode ? 'list' : 'table'}
          fields={[
            {
              label: (
                <div
                  css={`
                    display: flex;
                    justify-content: space-between;
                    color: ${theme.accentAlternative};
                    ${textStyle('body3')};
                    padding: 0 ${GU * 3}px;
                    width: 100%;
                  `}
                >
                  <h3>Origin</h3>
                  <h3>Relays</h3>
                </div>
              ),
            },
          ]}
          emptyState={emptyState}
          status={isLoading ? 'loading' : 'default'}
          entries={processedOriginClassification}
          renderEntry={({ origin, count, percentage }, index) => {
            return [
              <div
                css={`
                  width: 100%;
                `}
              >
                <div
                  css={`
                    background: ${theme.disabled};
                    height: ${compactMode ? GU * 14 : GU * 6}px;
                    display: flex;
                    justify-content: space-between;
                    margin: ${GU * 2}px 0 0 0;
                    border-radius: ${GU + 2}px ${GU + 2}px 0px 0px;
                    padding: ${GU + 6}px;
                    flex-wrap: wrap;
                  `}
                >
                  <div
                    css={`
                      height: 100%;
                      display: flex;
                      align-items: center;
                      flex-wrap: wrap;
                    `}
                  >
                    <p
                      css={`
                        ${textStyle('body4')}
                        color: ${HIGHLIGHT_COLORS[
                          index % HIGHLIGHT_COLORS.length
                        ]};
                        margin-right: ${GU * 3}px;
                        font-size: ${GU * 2}px;
                        font-weight: 600;
                      `}
                    >
                      {percentage.toFixed(2)}%
                    </p>
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
                              font-size: ${GU + 4}px;
                              vertical-align: middle;
                            }
                          `}
                        >
                          {origin}
                        </Link>
                      ) : (
                        'Unknown'
                      )}
                    </p>
                  </div>
                  <p
                    css={`
                      font-weight: 600;
                    `}
                  >
                    {count}
                  </p>
                </div>
                <div
                  css={`
                    width: 100%;
                    background: #606f7e;
                    height: ${GU / 2}px;
                  `}
                >
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
            ]
          }}
        />
      </>
    </Card>
  )
}
