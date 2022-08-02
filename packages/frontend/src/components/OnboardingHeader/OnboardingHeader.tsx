import { useAuth0 } from '@auth0/auth0-react'
import { useViewport } from 'use-viewport'
import { Link, GU, useTheme } from '@pokt-foundation/ui'
import styled from 'styled-components/macro'
import PortalLogo from '../../assets/portal_logo_full.png'

export default function OnboardingHeader() {
  const { loginWithRedirect } = useAuth0()
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')
  const theme = useTheme()

  return (
    <nav
      css={`
        width: 100vw;
        height: 64px;
        display: flex;
        align-items: center;
        max-width: ${148 * GU}px;
        margin: 0 auto;
      `}
    >
      <a
        href="https://portal.pokt.network"
        rel="noopener _noreferrer"
        target="blank"
        css={`
          text-decoration: none;
          flex-grow: 1;
        `}
      >
        <h1>
          <img
            src={PortalLogo}
            width="100%"
            height="auto"
            css={`
              max-width: ${26.5 * GU}px;
            `}
            alt="Pocket Portal"
          />
        </h1>
      </a>
      {!compactMode && (
        <ul
          css={`
            list-style: none;
            list-decoration: none;
            display: flex;
            & > li:not(last-child) {
              margin-right: ${6 * GU}px;
            }
          `}
        >
          <li>
            <BasicLink href="https://pokt.network">About Pocket</BasicLink>
          </li>
          <li>
            <BasicLink href="https://docs.pokt.network">Docs</BasicLink>
          </li>
          <li>
            <button
              onClick={() => loginWithRedirect()}
              css={`
                color: ${theme.accent};
                text-decoration: none;
                position: relative;
                display: inline-block;
                padding: 0;
                white-space: nowrap;
                background: none;
                border-radius: 8px;
                border: 0;
                outline: 0;
                cursor: pointer;
              `}
            >
              Log In
            </button>
          </li>
        </ul>
      )}
    </nav>
  )
}

const BasicLink = styled(Link)`
  && {
    text-decoration: none;
    color: white;
  }
`
