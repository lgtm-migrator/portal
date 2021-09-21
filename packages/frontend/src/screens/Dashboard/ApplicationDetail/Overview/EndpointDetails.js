import React, { useMemo } from 'react'
import { GU, TextCopy, textStyle, useToast } from '@pokt-foundation/ui'
import 'styled-components/macro'
import Box from '../../../../components/Box/Box'
import { prefixFromChainId } from '../../../../lib/chain-utils'

export default function EndpointDetails({ appData }) {
  const toast = useToast()

  const { chainId, appId, isLb } = appData
  const { prefix, name } = prefixFromChainId(chainId)

  const endpoint = useMemo(
    () =>
      `https://${prefix}.gateway.pokt.network/v1/${isLb ? 'lb/' : ''}${appId}`,
    [appId, isLb, prefix]
  )

  return (
    <Box>
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
            margin-bottom: ${3 * GU}px;
          `}
        >
          Endpoint
        </h3>
        <h4
          css={`
            ${textStyle('body3')}
            font-weight: 600;
            margin-bottom: ${3 * GU}px;
          `}
        >
          {name}
        </h4>
      </div>
      <TextCopy
        value={endpoint}
        css={`
          width: 100%;
        `}
        onCopy={() => toast('Endpoint copied to clipboard')}
      />
    </Box>
  )
}
