import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { UserLB } from '@pokt-foundation/portal-types'
import {
  GU,
  Spacer,
  TextCopy,
  IconPlus,
  ButtonBase,
  Popover,
  textStyle,
  useTheme,
  useToast,
  TextInput,
  IconDown,
  Button,
} from '@pokt-foundation/ui'
import 'styled-components/macro'
import { useViewport } from 'use-viewport'
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

const MAX_SELECTED_CHAINS = 5

enum UpdateTypes {
  SelectedChains = 'selectedChains',
}

function loadEndpointData(chainId: string, key: string) {
  const savedSelectedChains = localStorage.getItem(key)

  if (savedSelectedChains) {
    return JSON.parse(savedSelectedChains)
  }

  return [chainId || '0021']
}

function useEndpointData(appData: UserLB) {
  const { chain: chainId, id: appId } = appData
  const [selectedChains, setSelectedChains] = useState<Array<string>>([
    chainId || '0021',
  ])

  const LS_KEY = `${UpdateTypes.SelectedChains}-${appId}`

  useEffect(() => {
    setSelectedChains(loadEndpointData(chainId, LS_KEY))
  }, [chainId, LS_KEY])

  const updateSelectedChains = useCallback(
    (chainID) => {
      const isSelected = selectedChains.find((chain) => chain === chainID)

      if (isSelected) {
        return
      }

      setSelectedChains((prevSelectedChains) => {
        const newChains =
          prevSelectedChains.length === MAX_SELECTED_CHAINS
            ? [...prevSelectedChains.slice(1), chainID]
            : [...prevSelectedChains, chainID]

        localStorage.setItem(LS_KEY, JSON.stringify(newChains))
        return newChains
      })
    },
    [selectedChains, LS_KEY]
  )

  const removeSelectedChain = useCallback(
    (chainID) => {
      if (selectedChains.length === 1) {
        return
      }

      const updatedChains = []

      for (const id of selectedChains) {
        if (id === chainID) {
          continue
        }

        updatedChains.push(id)
      }

      setSelectedChains(updatedChains)

      localStorage.setItem(LS_KEY, JSON.stringify(updatedChains))
    },
    [selectedChains, LS_KEY]
  )

  return { updateSelectedChains, removeSelectedChain, selectedChains }
}

export default function EndpointDetails({ appData }: EndpointDetailsProps) {
  const { id: appId, gigastake } = appData
  const { removeSelectedChain, updateSelectedChains, selectedChains } =
    useEndpointData(appData)

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
              selectedChain={selectedChains[0]}
              updateSelectedChains={updateSelectedChains}
            />
          ) : (
            <LegacyChainName chainId={selectedChains[0]} />
          )}
        </div>
      </div>

      {selectedChains.map((chain) => (
        <EndpointUrl
          appId={appId}
          chainId={chain}
          gigastake={gigastake}
          removeSelectedChain={removeSelectedChain}
          key={chain}
        />
      ))}
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
  removeSelectedChain: (chainID: string) => void
}

function EndpointUrl({
  appId,
  chainId,
  gigastake,
  removeSelectedChain,
}: EndpointUrlProps) {
  const [isBtnHovered, setIsBtnHovered] = useState<boolean>(false)
  const toast = useToast()
  const theme = useTheme()
  const { prefix, abbrv, name } = prefixFromChainId(chainId) as ChainMetadata
  const { below } = useViewport()

  const chainImg = useMemo(() => getImageForChain(name), [name])

  const endpoint = useMemo(
    () => `https://${prefix}.gateway.pokt.network/v1/lb/${appId}`,
    [appId, prefix]
  )

  const handleHovered = useCallback(() => {
    setIsBtnHovered((prevHovered) => !prevHovered)
  }, [])

  return (
    <div
      css={`
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 0 ${GU * 2}px 0;
        flex-wrap: wrap;
      `}
    >
      <Button
        onClick={() => removeSelectedChain(chainId)}
        onMouseEnter={handleHovered}
        onMouseLeave={handleHovered}
        css={`
          width: ${8 * 10}px;
          height: ${GU * 4}px;
          text-overflow: ellipsis;
          overflow: auto;
          border-radius: 0;
          font-size: ${GU + 4}px;
          padding: 0;
          white-space: break-spaces;
          border: 1px solid ${theme.contentBorder};
          text-transform: uppercase;

          &:hover {
            background: ${theme.negative};
            border: 2px solid ${theme.negative};
            content: '-';
          }
        `}
      >
        {chainImg && !isBtnHovered ? (
          <img
            src={getImageForChain(name)}
            alt={abbrv}
            css={`
              width: ${GU * 2}px;
              height: ${GU * 2}px;
              margin-right: ${GU}px;
            `}
          />
        ) : null}
        {isBtnHovered ? (
          <div
            css={`
              width: ${GU + 4}px;
              height: 2px;
              background-color: ${theme.content};
            `}
          />
        ) : (
          abbrv
        )}
      </Button>
      <TextCopy
        value={endpoint}
        css={`
          ${below('medium')
            ? `width: 100%; margin-top: ${GU}px;`
            : 'width: 85%;'}
        `}
        onCopy={() => toast('Endpoint copied to clipboard')}
      />
    </div>
  )
}

interface ChainDropdownProps {
  selectedChain: string
  updateSelectedChains: (chainID: string) => void
}

function ChainDropdown({
  selectedChain,
  updateSelectedChains,
}: ChainDropdownProps) {
  const theme = useTheme()
  const [opened, setOpened] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { name } = prefixFromChainId(selectedChain) as ChainMetadata

  const handleToggle = useCallback(() => setOpened((opened) => !opened), [])
  const handleClose = useCallback(() => setOpened(false), [])
  const handleSelectChain = useCallback(
    (chainID) => {
      updateSelectedChains(chainID)
      setOpened(false)
    },
    [updateSelectedChains]
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
            border: 1px solid ${theme.accentAlternative};
            border-radius: ${GU - 4}px;
            width: ${4 * GU}px;
            height: ${4 * GU}px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
          `}
        >
          <IconPlus
            css={`
              width: ${GU * 2}px;
              height: ${GU * 2}px;
            `}
          />
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
        <TextInput
          value={name}
          wide
          placeholder="Select Chain"
          adornment={<IconDown />}
          adornmentPosition="end"
          onClick={handleToggle}
          readOnly
          css={`
            border: 2px solid ${theme.surfaceInteractiveBorder} !important;
            color: ${theme.surfaceContent} !important;
            width: ${GU * 31};
          `}
        />

        <ul
          css={`
            box-sizing: border-box;
            width: ${GU * 31};
            height: ${20 * GU}px;
            overflow-y: scroll;
            padding: 0;
            margin: 0;
            list-style: none;
            background: #141a21;
            color: ${theme.content};
          `}
        >
          {Array.from(CHAIN_ID_PREFIXES.entries()).map(([k, v]) => (
            <Item
              onClick={() => {
                handleSelectChain(k)
              }}
              icon={getImageForChain(v.name)}
              label={v.name}
            />
          ))}
        </ul>
      </Popover>
    </React.Fragment>
  )
}

interface ItemProps {
  icon: string
  label: string
  onClick?: () => void
}

function Item({ icon, label, onClick }: ItemProps) {
  const theme = useTheme()

  return (
    <li
      css={`
        &:hover {
          background-color: #20262c;
        }
      `}
    >
      <ButtonBase
        onClick={onClick}
        label={label}
        css={`
          width: 100%;
          height: ${6 * GU}px;
        `}
      >
        <div
          css={`
            display: flex;
            width: 100%;
            padding: ${2 * GU}px;
            justify-content: left;
            align-items: center;

            &:active,
            &:focus {
              background: ${theme.surfacePressed};
            }
          `}
        >
          {icon && (
            <img
              src={icon}
              alt={label}
              css={`
                width: ${2 * GU}px;
                height: ${2 * GU}px;
              `}
            />
          )}
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
