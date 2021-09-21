import React from 'react'
import { TextCopy, textStyle, useToast, GU } from '@pokt-foundation/ui'
import 'styled-components/macro'
import Box from '../../../../components/Box/Box'

export default function AppDetails({ apps, id, secret }) {
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
          App address{apps.length > 1 ? 'es' : ''}
        </h3>
        {apps.map(({ address }) => (
          <TextCopy
            value={address}
            onCopy={() => toast('App address copied to clipboard')}
          />
        ))}
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
