import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { animated, useSpring } from 'react-spring'
import {
  ButtonBase,
  Spacer,
  TextCopy,
  springs,
  textStyle,
  useTheme,
  useToast,
  GU,
  RADIUS,
} from '@pokt-foundation/ui'
import 'styled-components/macro'
import Box from '../../../../components/Box/Box'

const EXPANDABLE_LIST_HEIGHT = 258
const EXPANDABLE_MIN_LENGTH = 3

export default function GatewayPanel({ apps, id, secret }) {
  const toast = useToast()

  return (
    <Box
      css={`
        padding-bottom: ${4 * GU}px;
        div:not(:last-child) {
          margin-bottom: ${2 * GU}px;
        }
      `}
    >
      <div
        css={`
          width: 100%;
          display: flex;
          flex-direction: column;
        `}
      >
        <h3
          css={`
            ${textStyle('body1')};
            font-weight: 600;
            margin-bottom: ${2 * GU}px;
          `}
        >
          Gateway ID
        </h3>
        <TextCopy
          value={id}
          onCopy={() => toast('Gateway ID copied to clipboard')}
        />
      </div>
      {secret && (
        <div
          css={`
            width: 100%;
            display: flex;
            flex-direction: column;
          `}
        >
          <h3
            css={`
              ${textStyle('body1')};
              font-weight: 600;
              margin-bottom: ${2 * GU}px;
            `}
          >
            Secret Key
          </h3>
          <TextCopy
            value={secret}
            onCopy={() => toast('Secret key copied to clipboard')}
          />
        </div>
      )}
    </Box>
  )
}

export function AddressPanel({ apps }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('normal')
  const theme = useTheme()
  const toast = useToast()
  const { smooth } = springs

  useEffect(() => {
    if (apps.length > EXPANDABLE_MIN_LENGTH) {
      setMode('expandable')
    } else {
      setMode('normal')
    }
  }, [apps])

  const toggle = useCallback(() => setOpen((v) => !v), [])

  const totalListHeight = useMemo(
    () =>
      EXPANDABLE_LIST_HEIGHT +
      Math.max(0, apps.length - EXPANDABLE_MIN_LENGTH) * 40 +
      2 * GU,
    [apps.length]
  )

  const expand = useSpring({
    config: { ...smooth },
    height: open ? `${totalListHeight}px` : `${EXPANDABLE_LIST_HEIGHT}px`,
  })

  return (
    <Box
      css={`
        height: auto;
        padding: 0px;
        position: relative;
      `}
    >
      <animated.div
        style={mode === 'expandable' ? expand : {}}
        css={`
          position: relative;
          padding: ${3 * GU}px;
          height: ${mode === 'expandable'
            ? `${EXPANDABLE_LIST_HEIGHT}px`
            : 'auto'};
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        `}
      >
        <div
          css={`
            display: flex;
            justify-content: space-between;
          `}
        >
          <h3
            css={`
              ${textStyle('body1')};
              font-weight: 600;
              margin-bottom: ${2 * GU}px;
            `}
          >
            App address{apps.length > 1 ? 'es' : ''}
          </h3>
          <h3
            css={`
              ${textStyle('body1')};
              font-weight: 600;
              margin-bottom: ${2 * GU}px;
            `}
          >
            {apps.length ?? 0}
          </h3>
        </div>
        {apps.map(({ address }, index) => (
          <>
            <TextCopy
              value={address}
              onCopy={() => toast('App address copied to clipboard')}
            />
            {(mode === 'expandable' || index !== apps.length - 1) && (
              <Spacer size={2 * GU} />
            )}
          </>
        ))}
      </animated.div>
      {mode === 'expandable' && (
        <>
          <Spacer size={2 * GU} />
          <ButtonBase
            css={`
              && {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: ${5 * GU}px;
                border-top: 2px solid ${theme.accent};
                border-radius: 0 0 ${RADIUS}px ${RADIUS}px;
                background: linear-gradient(
                  126.96deg,
                  ${theme.backgroundGradient1} -5.41%,
                  ${theme.backgroundGradient2} 101.86%
                );
                color: ${theme.accent};
                font-weight: bold;
              }
            `}
            onClick={toggle}
          >
            <div
              css={`
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 ${4 * GU}px;
              `}
            >
              <span>Complete List</span>
              <ToggleArrow open={open} />
            </div>
          </ButtonBase>
        </>
      )}
    </Box>
  )
}

function ToggleArrow({ open }) {
  const { smooth } = springs
  const spin = useSpring({
    config: { ...smooth },
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
  })

  return (
    <animated.svg
      style={spin}
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="8"
      fill="none"
      viewBox="0 0 14 8"
    >
      <path
        stroke="#C5EC4B"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M1 1l6 6 6-6"
      ></path>
    </animated.svg>
  )
}
