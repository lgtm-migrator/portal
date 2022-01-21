import React, { useState, useRef, useCallback, useMemo } from 'react'
import { UserLB } from '@pokt-foundation/portal-types'
import {
  GU,
  Spacer,
  TextCopy,
  IconCog,
  ButtonBase,
  Popover,
  textStyle,
  useTheme,
  useToast,
  RADIUS,
} from '@pokt-foundation/ui'
import { useViewport } from 'use-viewport'
import 'styled-components/macro'
import Box from '../../../../components/Box/Box'
import {
  ChainMetadata,
  prefixFromChainId,
  CHAIN_ID_PREFIXES,
} from '../../../../lib/chain-utils'
import { getImageForChain } from '../../../../known-chains/known-chains'

interface EndpointDetailsProps {
  appData: UserLB
}

export default function EndpointDetails({ appData }: EndpointDetailsProps) {
  const { chain: chainId, id: appId, gigastake } = appData
  const [selectedChain, setSelectedChain] = useState(chainId || '0021')

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
          {gigastake ? (
            <ChainDropdown
              selectedChain={selectedChain}
              setSelectedChain={setSelectedChain}
            />
          ) : (
            <LegacyChainName chainId={selectedChain} />
          )}
        </div>
      </div>
      <EndpointUrl
        appId={appId}
        chainId={selectedChain}
        gigastake={gigastake}
      />
    </Box>
  )
}

interface LegacyChainNameProps {
  chainId: string
}

function LegacyChainName({ chainId }: LegacyChainNameProps) {
  const { name } = prefixFromChainId(chainId) as ChainMetadata
  const chainImage = getImageForChain(name)

  return (
    <>
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
    </>
  )
}

interface EndpointUrlProps {
  appId: string
  chainId: string
  gigastake: boolean
}

function EndpointUrl({ appId, chainId, gigastake }: EndpointUrlProps) {
  const toast = useToast()
  const { prefix } = prefixFromChainId(chainId) as ChainMetadata

  const endpoint = useMemo(
    () => `https://${prefix}.gateway.pokt.network/v1/lb/${appId}`,
    [appId, prefix]
  )

  return (
    <TextCopy
      value={endpoint}
      css={`
        width: 100%;
      `}
      onCopy={() => toast('Endpoint copied to clipboard')}
    />
  )
}

interface ChainDropdownProps {
  selectedChain: string
  setSelectedChain: (chainID: string) => void
}

function ChainDropdown({
  selectedChain,
  setSelectedChain,
}: ChainDropdownProps) {
  const theme = useTheme()
  const [opened, setOpened] = useState(false)
  const containerRef = useRef()
  const { below } = useViewport()
  const compact = below('medium')
  const { name } = prefixFromChainId(selectedChain) as ChainMetadata

  const handleToggle = useCallback(() => setOpened((opened) => !opened), [])
  const handleClose = useCallback(() => setOpened(false), [])
  const handleSelectChain = useCallback(
    (chainID) => {
      setSelectedChain(chainID)
      setOpened(false)
    },
    [setSelectedChain]
  )

  return (
    <React.Fragment>
      <div ref={containerRef}>
        <ButtonBase
          element="div"
          description="Preferences"
          label="Preferences"
          onClick={handleToggle}
          css={`
            border: 1px solid #fff;
            min-width: ${compact ? 20 * GU : 30 * GU}px;
            height: ${5 * GU}px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
          `}
        >
          {name}
        </ButtonBase>
      </div>
      <Popover
        closeOnOpenerFocus
        placement="bottom-end"
        onClose={handleClose}
        visible={opened}
        opener={containerRef.current}
        css={``}
      >
        <ul
          css={`
            /* Use 20px as the padding setting for popper is 10px */
            box-sizing: border-box;
            width: ${below('medium') ? `calc(100vw - 20px)` : `${30 * GU}px`};
            height: ${7 * 5 * GU}px;
            overflow-y: scroll;
            overflow-x: hidden;
            padding: 0;
            margin: 0;
            list-style: none;
            background: ${theme.surface};
            color: ${theme.content};
            border-radius: ${RADIUS}px;
          `}
        >
          {Array.from(CHAIN_ID_PREFIXES.entries()).map(([k, v]) => (
            <Item
              onClick={() => handleSelectChain(k)}
              icon={IconCog}
              label={v.name}
            />
          ))}
        </ul>
      </Popover>
    </React.Fragment>
  )
}

interface ItemProps {
  href?: string
  icon: string
  label: string
  onClick?: () => void
}

function Item({ icon, label, onClick }: ItemProps) {
  const theme = useTheme()

  return (
    <li
      css={`
        & + & {
          border-top: 1px solid ${theme.border};
        }
      `}
    >
      <ButtonBase
        onClick={onClick}
        label={label}
        css={`
          width: 100%;
          height: ${7 * GU}px;
          border-radius: 0;
        `}
      >
        <div
          css={`
            display: flex;
            width: 100%;
            height: 100%;
            padding: ${2 * GU}px;
            justify-content: left;
            align-items: center;

            &:active,
            &:focus {
              background: ${theme.surfacePressed};
            }
          `}
        >
          {icon && <img src={icon} alt="" />}
          <div
            css={`
              flex-grow: 1;
              display: flex;
              align-items: center;
              margin-left: ${icon ? 1 * GU : 0}px;
            `}
          >
            {label}
          </div>
        </div>
      </ButtonBase>
    </li>
  )
}
