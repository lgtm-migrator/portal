import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { useHistory } from 'react-router-dom'
import { useMutation, useQueryClient } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import * as Sentry from '@sentry/react'
import 'styled-components/macro'
import {
  Banner,
  Modal,
  Link,
  GU,
  TextInput,
  Button,
  textStyle,
  useTheme,
  Dropdown,
  DropdownItem,
} from '@pokt-foundation/ui'
import { useUser } from '../../../contexts/UserContext'
import { useUserApps } from '../../../contexts/AppsContext'
import { CHAIN_ID_PREFIXES, prefixFromChainId } from '../../../lib/chain-utils'
import { MAX_USER_APPS } from '../../../lib/pocket-utils'
import { log } from '../../../lib/utils'
import env from '../../../environment'
import {
  KNOWN_MUTATION_SUFFIXES,
  KNOWN_QUERY_SUFFIXES,
} from '../../../known-query-suffixes'
import { sentryEnabled } from '../../../sentry'
import { useViewport } from 'use-viewport'
import { getImageForChain } from '../../../known-chains/known-chains'
import { AmplitudeEvents } from '../../../lib/analytics'
import { useAuthHeaders } from '../../../hooks/useAuthHeaders'

const NORMALIZED_CHAIN_ID_PREFIXES = Array.from(CHAIN_ID_PREFIXES.entries())

const DEFAULT_CONFIGURE_STATE = {
  appName: '',
  secretKeyRequired: false,
  whitelistOrigins: [],
  whitelistUserAgents: [],
  whitelistContracts: [],
  whitelistMethods: [],
  appChain: '',
}

const UPDATE_TYPES = new Map([
  ['UPDATE_APP_NAME', 'appName'],
  ['UPDATE_APP_CHAIN', 'appChain'],
])

function useConfigureState() {
  const [appConfigData, setAppConfigData] = useState(DEFAULT_CONFIGURE_STATE)

  const updateAppConfigData = useCallback(
    (action) => {
      const keyToUpdate = UPDATE_TYPES.get(action.type)

      if (!keyToUpdate) {
        throw new Error(`No key matching ${action.type} was found.`)
      }

      const newAppConfigData = {
        ...appConfigData,
        [keyToUpdate]: action.payload,
      }

      log('New App Config Data', newAppConfigData)

      setAppConfigData(newAppConfigData)
    },
    [appConfigData]
  )

  const clearAppConfigData = useCallback(() => {
    setAppConfigData(DEFAULT_CONFIGURE_STATE)
  }, [])

  return {
    appConfigData,
    updateAppConfigData,
    clearAppConfigData,
  }
}

export default function CreateModal({ visible, onClose }) {
  const [creationModalVisible, setCreationModalVisible] = useState(false)
  const history = useHistory()
  const theme = useTheme()
  const { appConfigData, updateAppConfigData, clearAppConfigData } =
    useConfigureState()
  const {
    appName,
    secretKeyRequired,
    whitelistOrigins,
    whitelistUserAgents,
    whitelistContracts,
    whitelistMethods,
    appChain,
  } = appConfigData
  const { isAppsLoading, userApps, userID } = useUserApps()
  const { userLoading } = useUser()
  const queryClient = useQueryClient()
  const headers = useAuthHeaders()

  const {
    isError: isCreateError,
    isLoading: isCreateLoading,
    isSuccess: isCreateSuccess,
    mutate,
  } = useMutation(async function createApp() {
    try {
      const path = `${env('BACKEND_URL')}/api/lb`

      const res = await axios.post(
        path,
        {
          name: appName,
          gatewaySettings: {
            whitelistOrigins,
            whitelistUserAgents,
            whitelistContracts,
            whitelistMethods,
            secretKeyRequired,
          },
        },
        await headers
      )

      const { data } = res
      const { id } = data

      localStorage.setItem(`${id}_APP_CHAIN`, appChain)

      queryClient.invalidateQueries(KNOWN_QUERY_SUFFIXES.USER_APPS)

      if (env('PROD') && data) {
        amplitude.getInstance().logEvent(AmplitudeEvents.EndpointCreation, {
          creationDate: new Date().toISOString(),
          endpointId: id,
          endpointName: data.name,
          chainId: appConfigData.appChain,
          publicKeys: [data.apps[0].publicKey],
        })
      }

      onClose()

      history.push({
        pathname: `/app/${id}`,
      })

      return res
    } catch (err) {
      if (sentryEnabled) {
        Sentry.configureScope((scope) => {
          scope.setTransactionName(
            KNOWN_MUTATION_SUFFIXES.CREATE_ENDPOINT_MUTATION
          )
        })
        Sentry.captureException(err)
      }
      throw err
    }
  })

  const memoizableUserApps = JSON.stringify(userApps)

  useEffect(() => {
    if (
      userApps.length >= MAX_USER_APPS &&
      userID &&
      !env('GODMODE_ACCOUNTS').includes(userID) &&
      env('PROD')
    ) {
      setCreationModalVisible(true)
    }
  }, [memoizableUserApps, userApps.length, userID])

  const onCloseCreationModal = useCallback(() => {
    setCreationModalVisible(false)
    onClose()
  }, [onClose])

  const isCreateDisabled = useMemo(
    () =>
      !appName ||
      !appChain ||
      isAppsLoading ||
      isCreateError ||
      isCreateLoading ||
      isCreateSuccess ||
      userLoading ||
      (userApps.length >= MAX_USER_APPS &&
        !env('GODMODE_ACCOUNTS').includes(userID)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      appName,
      isAppsLoading,
      isCreateError,
      isCreateLoading,
      isCreateSuccess,
      memoizableUserApps,
      userID,
      userLoading,
      appChain,
    ]
  )

  return (
    <Fragment>
      {!creationModalVisible ? (
        <Modal
          visible={visible}
          onClose={() => {
            clearAppConfigData()
            onClose()
          }}
          height={`${53 * GU}px`}
          css={`
            div {
              div[role='alertdialog'] {
                overflow: inherit;
              }
            }
          `}
        >
          <>
            <h1
              css={`
                ${textStyle('title2')};
                color: ${theme.accentAlternative};
                margin: 0 0 ${2 * GU}px 0;
              `}
            >
              Create an App
            </h1>
            <p
              css={`
                ${textStyle('body2')}
                margin: 0 0 ${2 * GU}px 0;
              `}
            >
              Welcome to Pocket Network Sponsor Stake. Your application will
              receive up to 1M free daily relays to connect to any of our{' '}
              <Link href="#">suported chains</Link>, provided by Pocket Network
              Inc.
            </p>

            <TextInput
              value={appConfigData.appName ?? ''}
              onChange={(e) =>
                updateAppConfigData({
                  type: 'UPDATE_APP_NAME',
                  payload: e.target.value,
                })
              }
              placeholder="New App Name"
              wide
              css={`
                margin: 0 0 ${2 * GU}px 0;
              `}
            />
            <ChainDropdown updateAppChain={updateAppConfigData} />
            <Button
              wide
              onClick={mutate}
              disabled={isCreateDisabled}
              mode="primary"
              css={`
                margin: ${2 * GU}px 0;
              `}
            >
              Launch Application
            </Button>
            <p
              css={`
                ${textStyle('body4')};
                text-align: center;
              `}
            >
              By using this application and the service, you agree to our{' '}
              <Link href="https://www.pokt.network/site-terms-of-use">
                {' '}
                Terms of Use.
              </Link>
            </p>
          </>
        </Modal>
      ) : (
        <CreationDenialModal
          onClose={onCloseCreationModal}
          visible={creationModalVisible}
        />
      )}
    </Fragment>
  )
}

function CreationDenialModal({ onClose, visible }) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      css={`
        & > div > div > div > div {
          padding: 0 !important;
        }
      `}
    >
      <div
        css={`
          max-width: ${87 * GU}px;
        `}
      >
        <Banner mode="warning" title="You've reached your endpoint limit">
          Pocket Portal only allows each account to have 2 endpoints. If you
          need more, please{' '}
          <Link href="mailto:sales@pokt.network">contact our team</Link> and
          we'll work out a solution for you.
        </Banner>
      </div>
    </Modal>
  )
}

function ChainDropdown({ updateAppChain }) {
  const { below } = useViewport()
  const [opened, setOpened] = useState(false)
  const [chainName, setChainName] = useState('')
  const [chains, setChains] = useState(NORMALIZED_CHAIN_ID_PREFIXES)

  const handleToggle = useCallback(() => setOpened((opened) => !opened), [])

  const handleInternalChainsListReplacement = useCallback((chainName) => {
    const tempChains = []

    for (const chain of NORMALIZED_CHAIN_ID_PREFIXES) {
      if (chain[1].name.toLowerCase().includes(chainName.toLowerCase())) {
        tempChains.push(chain)
      }
    }

    setChains(tempChains)
  }, [])

  const handleChainsSearch = useCallback(
    (searchedChain) => {
      setChainName(searchedChain)
      updateAppChain({
        type: 'UPDATE_APP_CHAIN',
        payload: '',
      })

      if (searchedChain.length === 0) {
        setChains(NORMALIZED_CHAIN_ID_PREFIXES)
        return
      }

      handleInternalChainsListReplacement(searchedChain)
    },
    [updateAppChain, handleInternalChainsListReplacement]
  )

  const handleSelectChain = useCallback(
    (chainID) => {
      updateAppChain({
        type: 'UPDATE_APP_CHAIN',
        payload: chainID,
      })
      const { name } = prefixFromChainId(chainID)

      setChainName(name)

      handleInternalChainsListReplacement(name)
      setOpened(false)
    },
    [updateAppChain, handleInternalChainsListReplacement]
  )

  return (
    <div
      css={`
        height: 100%;
        width: 100%;
      `}
    >
      <Dropdown
        value={chainName}
        visible={opened}
        handleToggle={handleToggle}
        onChange={(e) => handleChainsSearch(e.target.value)}
        onClose={() => setOpened(false)}
        placeholder="Select Chain"
        css={`
          ul {
            width: ${below('medium') ? `calc(100vw - 20px)` : `${69 * GU}px`};
            height: ${opened && (chains.length > 4 ? 24 : 14) * GU}px;
          }

          *::-webkit-scrollbar {
            width: 5px !important;
            height: 32px !important;
          }

          *::-webkit-scrollbar-thumb {
            height: 32px !important;
          }

          * {
            overflow: -moz-scrollbars-vertical;
            -ms-overflow-style: none;
          }
        `}
      >
        {chains.length > 0 ? (
          chains.map(([k, v]) => (
            <DropdownItem
              onClick={() => {
                handleSelectChain(k)
              }}
              icon={getImageForChain(v.name)}
              label={v.name}
            />
          ))
        ) : (
          <DropdownItem label="No chains found with that name" />
        )}
      </Dropdown>
    </div>
  )
}
