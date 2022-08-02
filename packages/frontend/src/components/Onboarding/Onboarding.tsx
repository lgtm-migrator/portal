import React from 'react'
import { useViewport } from 'use-viewport'
import { Spacer, useTheme, GU } from '@pokt-foundation/ui'
import 'styled-components/macro'
import OnboardingHeader from '../OnboardingHeader/OnboardingHeader'
import PortalLogo from '../../assets/portal_logo.svg'

interface OnboardingProps {
  children: React.ReactChildren
}

export default function Onboarding({
  children,
}: OnboardingProps): React.ReactElement {
  const theme = useTheme()
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')

  return (
    <div
      css={`
        position: relative;
        width: 100%;
        min-height: 100vh;
        position: relative;
        background: linear-gradient(
            138.23deg,
            ${theme.overlay} -1.67%,
            #131b23 49.49%,
            #32343f 109.02%
          ),
          linear-gradient(
            108.79deg,
            ${theme.overlay} -5.55%,
            #101921 45.97%,
            #363843 123.27%
          );
      `}
    >
      <Spacer size={compactMode ? 1 * GU : 6.5 * GU} />
      <OnboardingHeader />
      <Spacer size={4 * GU} />
      <div
        css={`
          width: 100%;
          height: 100%;
          height: calc(100vh-80px);
          display: grid;
          grid-template-columns: 50% 1fr;
          grid-template-rows: 1fr;
          grid-column-gap: 32px;
          grid-row-gap: 0px;
          align-items: center;
          ${compactMode &&
          `
            grid-template-columns: 1fr;
            grid-column-gap: 0px;
          `}
          max-width: ${144 * GU}px;
          margin: 0 auto;
        `}
      >
        <div>
          <main>
            <Spacer size={3 * GU} />
            {children}
          </main>
        </div>
        {!compactMode && (
          <img
            src={PortalLogo}
            alt=""
            role="presentation"
            css={`
              grid-column-start: 2;
              align-self: start;
              height: 100%;
              max-height: ${72 * GU}px;
              width: 100%;
            `}
          />
        )}
      </div>
    </div>
  )
}
