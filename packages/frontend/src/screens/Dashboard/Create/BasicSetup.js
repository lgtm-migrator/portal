import React, { useState, useMemo, useCallback } from 'react'
import { useViewport } from 'use-viewport'
import 'styled-components/macro'
import {
  Button,
  DataView,
  Help,
  IconSearch,
  Link,
  Spacer,
  Split,
  Switch,
  TextInput,
  textStyle,
  GU,
} from '@pokt-foundation/ui'
import AppStatus from '../../../components/AppStatus/AppStatus'
import Box from '../../../components/Box/Box'
import { getImageForChain } from '../../../known-chains/known-chains'
import { ALPHA_CHAINS, PRODUCTION_CHAINS } from '../../../lib/chain-utils'
import {
  FREE_TIER_MAX_RELAYS,
  FREE_TIER_TOKENS,
} from '../../../lib/pocket-utils'

export default function BasicSetup({
  data,
  incrementScreen,
  isCreateDisabled,
  onCreateApp,
  updateData,
  chains,
}) {
  const [chainName, setChainName] = useState('')
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')

  const onSetChainName = useCallback((e) => {
    setChainName(e.target.value)
  }, [])
  const onSwitchClick = useCallback(
    (chainId) => {
      if (data.selectedNetwork && data.selectedNetwork === chainId) {
        updateData({ type: 'UPDATE_SELECTED_NETWORK', payload: '' })
      } else {
        updateData({ type: 'UPDATE_SELECTED_NETWORK', payload: chainId })
      }
    },
    [data, updateData]
  )

  const filteredChains = useMemo(() => {
    if (!chainName) {
      return chains
    }
    return chains.filter(
      ({ description: name }) =>
        name.toLowerCase().indexOf(chainName) >= 0 ||
        name.indexOf(chainName) >= 0
    )
  }, [chainName, chains])

  return (
    <>
      <Split
        primary={
          <>
            <h2
              css={`
                ${textStyle('title2')}
              `}
            >
              Welcome to the Pocket Network Free Tier
            </h2>
            <Spacer size={1 * GU} />
            <p
              css={`
                ${textStyle('body4')}
              `}
            >
              Your application will receive up to 1M free daily relays provided
              by Pocket Network Inc. By using this application and the service,
              you agree to our&nbsp;
              <Link href="https://www.pokt.network/site-terms-of-use">
                Terms of Use
              </Link>
              .
            </p>
            <Spacer size={5 * GU} />
            <Box title="App Name">
              <TextInput
                value={data.appName ?? ''}
                onChange={(e) =>
                  updateData({
                    type: 'UPDATE_APP_NAME',
                    payload: e.target.value,
                  })
                }
                placeholder="New App Name"
                wide
              />
            </Box>
            <Spacer size={3 * GU} />
            <Box>
              <h2
                css={`
                  ${textStyle('title2')}
                `}
              >
                Select Network
              </h2>
              <Spacer size={1 * GU} />
              <p
                css={`
                  ${textStyle('body4')}
                `}
              >
                Choose the network you want to connect your app to.{' '}
                <span
                  css={`
                    font-weight: bold;
                  `}
                >
                  Be aware that you will only be able to change the selected
                  network once a week.
                </span>
                &nbsp; If you have any issues while using any of our supported
                chains, let us know on our&nbsp;
                <Link href="https://bit.ly/POKTARCADEdscrd">Discord.</Link>
              </p>
              <Spacer size={3 * GU} />
              <TextInput
                value={chainName}
                onChange={onSetChainName}
                placeholder="Ethereum Mainnet"
                adornment={
                  <div
                    css={`
                      height: 100%;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      color: white;
                    `}
                  >
                    <IconSearch />
                  </div>
                }
                adornmentPosition="end"
                wide
              />
              <Spacer size={2 * GU} />
              <DataView
                fields={[
                  '',
                  { label: 'Network', align: 'start' },
                  { label: 'Apps', align: 'start' },
                  { label: 'Status', align: 'start' },
                ]}
                entries={filteredChains}
                renderEntry={({
                  appCount,
                  description,
                  id,
                  isAvailableForStaking,
                }) => {
                  const chainImage = getImageForChain(description)

                  return [
                    <Switch
                      onChange={() => onSwitchClick(id)}
                      checked={data.selectedNetwork === id}
                      disabled={!isAvailableForStaking}
                    />,
                    <div
                      css={`
                        height: 100%;
                        width: ${35 * GU}px;
                        display: flex;
                        justify-content: flex-start;
                        align-items: center;
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
                      <Spacer size={2 * GU} />
                      <p
                        css={`
                          overflow-wrap: break-word;
                          word-break: break-word;
                          hyphens: auto;
                        `}
                      >
                        {description}
                      </p>
                    </div>,
                    <p>{appCount ?? 0}</p>,
                    <div
                      css={`
                        display: flex;
                        flex-direction: row;
                        justify-content: center;
                        align-items: center;
                      `}
                    >
                      <p>
                        {PRODUCTION_CHAINS.includes(id) ? 'Production' : 'Beta'}
                      </p>
                      <Spacer size={1 * GU} />
                      <Help
                        hint="What is this?"
                        placement={compactMode ? 'auto' : 'right'}
                      >
                        {PRODUCTION_CHAINS.includes(id)
                          ? 'Production RelayChainIDs are very stable and thoroughly tested.'
                          : ''}
                        {ALPHA_CHAINS.includes(id)
                          ? 'Alpha RelayChainIDs are in the earliest phase of node onboarding and testing. Users may encounter issues, higher than production latency, or some quality of service issues. '
                          : ''}
                        {!PRODUCTION_CHAINS.includes(id) &&
                        !ALPHA_CHAINS.includes(id)
                          ? 'Beta RelayChainIDs are in the process of being externally tested. Users may encounter edge case issues, higher than production latency, or some brief quality of service issues. '
                          : ''}
                      </Help>
                    </div>,
                  ]
                }}
              />
            </Box>
          </>
        }
        secondary={
          <>
            <Button
              wide
              onClick={onCreateApp}
              disabled={isCreateDisabled}
              mode="primary"
            >
              Launch Application
            </Button>
            <Spacer size={2 * GU} />
            <Button wide onClick={() => incrementScreen()}>
              App Security
            </Button>
            <Spacer size={3 * GU} />
            <AppStatus
              stakedTokens={FREE_TIER_TOKENS}
              maxDailyRelays={FREE_TIER_MAX_RELAYS}
            />
            <Spacer size={3 * GU} />
            <p
              css={`
                ${textStyle('body4')}
              `}
            >
              If you are looking to stake your own POKT or you need more relays
              for your application please{' '}
              <Link href="mailto:sales@pokt.network">contact us</Link> and our
              team will find a solution for you.
            </p>
          </>
        }
      />
    </>
  )
}
