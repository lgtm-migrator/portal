import React, { useMemo } from 'react'
import { GU, Spacer, TextCopy, textStyle, useToast } from '@pokt-foundation/ui'
import 'styled-components/macro'
import Box from '../../../../components/Box/Box'
import { prefixFromChainId } from '../../../../lib/chain-utils'
import { getImageForChain } from '../../../../known-chains/known-chains'

export default function EndpointDetails({ appData }) {
  const toast = useToast()

  const { chain: chainId, id: appId, isLb } = appData
  const { prefix, name } = prefixFromChainId(chainId)
  const chainImage = getImageForChain(name)

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
        <div
          css={`
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: ${3 * GU}px;
          `}
        >
          <img
            src={chainImage}
            css={`
              max-height: ${2 * GU}px;
              max-width: auto;
            `}
            alt=""
          />
          <Spacer size={1 * GU} />
          <h4
            css={`
              ${textStyle('body1')}
              font-weight: 600;
            `}
          >
            {name}
          </h4>
        </div>
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
