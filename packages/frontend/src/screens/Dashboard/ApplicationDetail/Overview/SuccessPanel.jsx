import React, { useMemo } from 'react'
import { useHistory, useRouteMatch } from 'react-router'
import { animated, useSpring } from 'react-spring'
import {
  ButtonBase,
  Spacer,
  color,
  textStyle,
  useTheme,
  GU,
  RADIUS,
} from '@pokt-foundation/ui'
import 'styled-components/macro'
import { useSuccessRateColor } from '../application-utils'
import SuccessIndicator from '../SuccessIndicator'
import Box from '../../../../components/Box/Box'

export default function SuccessPanel({
  previousSuccessRate = 0,
  successRate,
  totalRequests,
}) {
  const history = useHistory()
  const { url } = useRouteMatch()
  const theme = useTheme()
  const numberProps = useSpring({
    number: Math.min(successRate * 100, 100),
    from: { number: 0 },
  })
  const [primarySuccessColor] = useSuccessRateColor(successRate)
  const successRateDelta = useMemo(() => {
    const actualPreviousSuccessRate =
      previousSuccessRate > 1.0 ? 1 : previousSuccessRate

    if (successRate >= 0.9999) {
      return (0).toFixed(2)
    }

    return (((successRate - actualPreviousSuccessRate) / 1) * 100).toFixed(2)
  }, [previousSuccessRate, successRate])

  const mode = successRateDelta > 0 ? 'positive' : 'negative'

  return (
    <Box
      padding={[0, 0, 0, 0]}
      css={`
        display: flex;
        flex-direction: column;
      `}
    >
      <div
        css={`
          position: relative;
          background: linear-gradient(
            180deg,
            ${primarySuccessColor} -20.71%,
            ${color(primarySuccessColor).alpha(0)} 113.05%
          );
          height: ${12 * GU}px;
          border-radius: ${1 * GU}px ${1 * GU}px 0 0;
          display: flex;
          justify-content: center;
          align-items: center;
        `}
      >
        <animated.h2
          css={`
            font-size: ${6 * GU}px;
            font-weight: bold;
          `}
        >
          {numberProps.number.interpolate((x) => `${x.toFixed(2)}%`)}
        </animated.h2>
      </div>
      <div
        css={`
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: ${1 * GU}px ${3 * GU}px ${1 * GU}px ${3 * GU}px;
        `}
      >
        <div
          css={`
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
          `}
        >
          <h3
            css={`
              ${textStyle('title2')}
            `}
          >
            Success Rate
          </h3>
          <div
            css={`
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            `}
          >
            <div
              css={`
                display: flex;
                align-items: center;
              `}
            >
              {totalRequests ? <SuccessIndicator mode={mode} /> : ''}
              <Spacer size={GU / 2} />
              <span
                css={`
                  ${textStyle('body3')};
                  font-weight: 800;
                `}
              >
                {Math.abs(successRateDelta)}%
              </span>
            </div>
            <p
              css={`
                ${textStyle('body4')}
              `}
            >
              Last 24 hours
            </p>
          </div>
        </div>
        <Spacer size={1 * GU} />
        <div
          css={`
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
          `}
        >
          <h3
            css={`
              ${textStyle('title3')}
              font-weight: 700;
            `}
          >
            Total requests
          </h3>
          <h4
            css={`
              ${textStyle('body3')}
            `}
          >
            {Intl.NumberFormat().format(totalRequests)}
          </h4>
        </div>
      </div>

      <ButtonBase
        css={`
          && {
            bottom: 0;
            left: 0;
            width: 100%;
            height: ${5 * GU}px;
            border-top: 2px solid ${theme.accent};
            border-radius: 0 0 ${RADIUS}px ${RADIUS}px;
            color: ${theme.accent};
            font-weight: bold;
          }
        `}
        onClick={() => history.push(`${url}/success-details`)}
      >
        More Details
      </ButtonBase>
    </Box>
  )
}
