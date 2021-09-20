import React, { useMemo } from 'react'
import { useViewport } from 'use-viewport'
import {
  DataView,
  Link,
  Spacer,
  textStyle,
  useTheme,
  GU,
} from '@pokt-foundation/ui'
import Box from '../Box/Box'
import { useOriginClassification } from '../../hooks/application-hooks'
import 'styled-components/macro'

const HIGHLIGHT_COLORS = ['#D27E31', '#55B02B', '#BB31D2', '#31ABD2', '#D2CC31']

export function OriginClassification({ id, maxRelays }) {
  const theme = useTheme()
  const { within } = useViewport()
  const { isLoading, originData } = useOriginClassification({
    id,
  })

  const compactMode = within(-1, 'medium')

  const originClassification = useMemo(() => {
    if (!originData) {
      return []
    }
    return originData
  }, [originData])

  const totalRelays = originClassification.reduce((acc, { count = 0 }) => {
    return acc + count
  }, 0)

  const processedOriginClassification = useMemo(() => {
    return originClassification.map(({ origin, count }) => ({
      origin,
      count,
      percentage: count / totalRelays,
    }))
  }, [originClassification, totalRelays])

  return (
    <Box
      title="Usage by Origin"
      css={`
        padding-bottom: ${4 * GU}px;
      `}
    >
      {!isLoading && (
        <>
          <Spacer size={2 * GU} />
          <div
            css={`
              display: flex;
              width: 100%;
              justify-content: space-between;
            `}
          >
            <p
              css={`
                ${textStyle('body4')}
              `}
            >
              0%
            </p>
            <p
              css={`
                ${textStyle('body4')}
              `}
            >
              100%
            </p>
          </div>
          <Spacer size={GU / 2} />
          <div
            css={`
              position: relative;
              width: 100%;
              height: ${1 * GU}px;
            `}
          >
            <div
              css={`
                position: absolute;
                top: -${GU / 2}px;
                left: ${(totalRelays / maxRelays) * 100}%;
                width: ${GU / 4}px;
                height: ${GU * 1.5}px;
                background: ${theme.accentAlternative};
                &:before {
                  content: '${Math.floor((totalRelays / maxRelays) * 100)}%';
                  color: ${theme.accentAlternative};
                  position: absolute;
                  top: -${GU * 3}px;
                  left: -${GU}px;
                }
              `}
            />
            <div
              css={`
                display: flex;
                width: 100%;
                overflow: hidden;
                height: ${1 * GU}px;
                background: #32404f;
                border-radius: ${2.5 * GU}px;
                div {
                  height: ${1 * GU}px;
                }
              `}
            >
              {originClassification.map(({ origin, count }, index) => {
                return (
                  <div
                    key={index}
                    title={origin}
                    style={{
                      width: `${(count / maxRelays) * 100}%`,
                      background:
                        HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length],
                    }}
                  />
                )
              })}
            </div>
          </div>
          <Spacer size={GU / 2} />
          <p
            css={`
              ${textStyle('body4')} text-align: right;
            `}
          >
            <span>
              {new Intl.NumberFormat('en-US', {
                notation: 'compact',
                compactDisplay: 'short',
              }).format(maxRelays)}
            </span>
            &nbsp; relays a day
          </p>
          <Spacer size={2 * GU} />
        </>
      )}
      <DataView
        mode={compactMode ? 'list' : 'table'}
        fields={[
          { label: 'Origin' },
          { label: 'Relays', align: 'right' },
          { label: 'Usage %' },
        ]}
        status={isLoading ? 'loading' : 'default'}
        entries={processedOriginClassification}
        renderEntry={({ origin, count, percentage }, index) => {
          return [
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
                      max-width: 200px;
                      overflow: hidden;
                      white-space: nowrap;
                      text-overflow: ellipsis;
                    }
                  `}
                >
                  {origin}
                </Link>
              ) : (
                'Unknown'
              )}
            </p>,
            <p>{count}</p>,
            <p>
              <span
                css={`
                  display: inline-block;
                  width: ${1.5 * GU}px;
                  height: ${1.5 * GU}px;
                  border-radius: 50% 50%;
                  background: ${HIGHLIGHT_COLORS[
                    index % HIGHLIGHT_COLORS.length
                  ]};
                  box-shadow: ${HIGHLIGHT_COLORS[
                      index % HIGHLIGHT_COLORS.length
                    ]}
                    0px 2px 8px 0px;
                `}
              />
              &nbsp;{percentage.toFixed(2)} %
            </p>,
          ]
        }}
      />
    </Box>
  )
}
