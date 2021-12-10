import React from 'react'
import 'styled-components/macro'
import {
  Banner,
  Button,
  Link,
  Spacer,
  textStyle,
  GU,
} from '@pokt-foundation/ui'

export default function Fallback(): React.ReactElement {
  return (
    <div
      css={`
        width: 100vw;
        height: 100vh;
        background: #00182a;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: ${2 * GU}px;
      `}
    >
      <div
        css={`
          max-width: ${87 * GU}px;
        `}
      >
        <Banner mode="error" title="Something went wrong">
          <p
            css={`
              ${textStyle('body2')}
              color: #fff;
            `}
          >
            Oh no, the Portal has inexplicably closed! Click Reload to try
            opening it again. If this issue persists,&nbsp;
            <Link href="https://discord.gg/uCZZkHTQjV">
              contact us on Discord.
            </Link>
          </p>
          <Spacer size={5 * GU} />
          <div
            css={`
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
            `}
          >
            <Button
              onClick={() => window.location.reload()}
              css={`
                && {
                  width: ${27 * GU}px;
                }
              `}
            >
              Reload
            </Button>
          </div>
        </Banner>
      </div>
    </div>
  )
}
