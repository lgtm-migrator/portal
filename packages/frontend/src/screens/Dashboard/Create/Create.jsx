import { useState, useEffect, useMemo, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { animated, useTransition } from 'react-spring'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import * as Sentry from '@sentry/react'
import 'styled-components/macro'
import { Banner, Modal, Link, springs, GU } from '@pokt-foundation/ui'
import BasicSetup from './BasicSetup'
import SecuritySetup from './SecuritySetup'
import FloatUp from '../../../components/FloatUp/FloatUp'
import { useUser } from '../../../contexts/UserContext'
import { useUserApps } from '../../../contexts/AppsContext'
import { AmplitudeEvents } from '../../../lib/analytics'
import { processChains } from '../../../lib/chain-utils'
import { MAX_USER_APPS } from '../../../lib/pocket-utils'
import { log } from '../../../lib/utils'
import env from '../../../environment'
import {
  KNOWN_MUTATION_SUFFIXES,
  KNOWN_QUERY_SUFFIXES,
} from '../../../known-query-suffixes'
import { sentryEnabled } from '../../../sentry'

const APP_CONFIG_DATA_KEY = 'POKT_NETWORK_APP_CONFIG_DATA'
const APP_CONFIG_SCREEN_KEY = 'POKT_NETWORK_APP_CONFIG_SREEN'

const DEFAULT_CONFIGURE_STATE = {
  appName: '',
  secretKeyRequired: false,
  whitelistOrigins: [],
  whitelistUserAgents: [],
}

const SCREENS = new Map([
  [0, BasicSetup],
  [1, SecuritySetup],
])

const UPDATE_TYPES = new Map([
  ['UPDATE_APP_NAME', 'appName'],
  ['UPDATE_REQUIRE_SECRET_KEY', 'secretKeyRequired'],
  ['UPDATE_WHITELISTED_ORIGINS', 'whitelistOrigins'],
  ['UPDATE_WHITELISTED_USER_AGENTS', 'whitelistUserAgents'],
])

function loadConfigureState() {
  const appConfigData = localStorage.getItem(APP_CONFIG_DATA_KEY)
  const screenIndex = localStorage.getItem(APP_CONFIG_SCREEN_KEY)

  try {
    const deserializedConfigData =
      JSON.parse(appConfigData) ?? DEFAULT_CONFIGURE_STATE
    const deserializedScreenIndex = JSON.parse(screenIndex) ?? 0

    return {
      appConfigData: deserializedConfigData,
      screenIndex: Number(deserializedScreenIndex),
    }
  } catch (err) {
    // This might look weird at first, but we've got no good way to tell if
    // failure to deserialize this data is a browser issue, or just people
    // cleaning their localStorage data, so we just assume the happy path.
    return DEFAULT_CONFIGURE_STATE
  }
}

function useConfigureState() {
  const [appConfigData, setAppConfigData] = useState(DEFAULT_CONFIGURE_STATE)
  const [prevScreenIndex, setPrevScreenIndex] = useState(-1)
  const [screenIndex, setScreenIndex] = useState(0)

  useEffect(() => {
    const { appConfigData, screenIndex } = loadConfigureState()

    setAppConfigData(appConfigData)
    setScreenIndex(screenIndex)
  }, [])

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

  const incrementScreenIndex = useCallback(() => {
    setPrevScreenIndex(screenIndex)
    setScreenIndex((screenIndex) => screenIndex + 1)
  }, [screenIndex])

  const decrementScreenIndex = useCallback(() => {
    setPrevScreenIndex(screenIndex)
    setScreenIndex((screenIndex) => screenIndex - 1)
  }, [screenIndex])

  return {
    appConfigData,
    decrementScreenIndex,
    incrementScreenIndex,
    prevScreenIndex,
    screenIndex,
    updateAppConfigData,
  }
}

export default function Create() {
  const [creationModalVisible, setCreationModalVisible] = useState(false)
  const history = useHistory()
  const {
    appConfigData,
    decrementScreenIndex,
    incrementScreenIndex,
    prevScreenIndex,
    screenIndex,
    updateAppConfigData,
  } = useConfigureState()
  const { appName, secretKeyRequired, whitelistOrigins, whitelistUserAgents } =
    appConfigData
  const { isAppsLoading, userApps, userID } = useUserApps()
  const { userLoading } = useUser()
  const queryClient = useQueryClient()

  const {
    isLoading: isChainsLoading,
    isError: isChainsError,
    data: chains,
  } = useQuery(
    KNOWN_QUERY_SUFFIXES.STAKEABLE_CHAINS,
    async function getNetworkChains() {
      const path = `${env('BACKEND_URL')}/api/network/usable-chains`

      try {
        const res = await axios.get(path, {
          withCredentials: true,
        })

        const { data: chains } = res

        return processChains(chains)
      } catch (err) {
        if (sentryEnabled) {
          Sentry.configureScope((scope) => {
            scope.setTransactionName(KNOWN_QUERY_SUFFIXES.STAKEABLE_CHAINS)
          })
          Sentry.captureException(err)
        }
        throw err
      }
    }
  )

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
            secretKeyRequired,
          },
        },
        {
          withCredentials: true,
        }
      )

      const { data } = res
      const { id } = data

      queryClient.invalidateQueries(KNOWN_QUERY_SUFFIXES.USER_APPS)

      if (env('PROD')) {
        amplitude.getInstance().logEvent(AmplitudeEvents.EndpointCreation, {
          creationDate: new Date().toISOString(),
        })
      }

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
      console.log('yeah')
    }
  }, [memoizableUserApps, userApps.length, userID])

  const onCloseCreationModal = useCallback(() => {
    setCreationModalVisible(false)
    history.push('/home')
  }, [history])

  const ActiveScreen = useMemo(
    () => SCREENS.get(screenIndex) ?? null,
    [screenIndex]
  )

  const direction = screenIndex > prevScreenIndex ? 1 : -1
  const transitionProps = useTransition(screenIndex, null, {
    from: {
      opacity: 0,
      position: 'absolute',
      transform: `translate3d(${10 * direction}%, 0, 0)`,
    },
    enter: {
      opacity: 1,
      position: 'static',
      transform: `translate3d(0%, 0, 0)`,
    },
    leave: {
      opacity: 0,
      position: 'absolute',
      transform: `translate3d(${-10 * direction}%, 0, 0)`,
    },
    config: springs.smooth,
    immediate: screenIndex === 0 && prevScreenIndex === -1,
  })

  console.log(
    appName,
    isAppsLoading,
    isChainsError,
    isChainsLoading,
    isCreateError,
    isCreateLoading,
    isCreateSuccess,
    userLoading,
    userApps.length >= MAX_USER_APPS &&
      !env('GODMODE_ACCOUNTS').includes(userID)
  )

  const isCreateDisabled = useMemo(
    () =>
      !appName ||
      isAppsLoading ||
      isChainsError ||
      isChainsLoading ||
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
      isChainsError,
      isChainsLoading,
      isCreateError,
      isCreateLoading,
      isCreateSuccess,
      memoizableUserApps,
      userID,
      userLoading,
    ]
  )

  return (
    <FloatUp
      fallback={() => <p>Loading...</p>}
      loading={isChainsLoading}
      content={() => (
        <div
          css={`
            width: 100%;
            position: relative;
            overflow-x: hidden;
          `}
        >
          {transitionProps.map(({ key, props }) => (
            <animated.div
              key={key}
              style={props}
              css={`
                top: 0;
                left: 0;
                right: 0;
              `}
            >
              <ActiveScreen
                chains={chains}
                data={appConfigData}
                decrementScreen={decrementScreenIndex}
                incrementScreen={incrementScreenIndex}
                isCreateDisabled={isCreateDisabled}
                onCreateApp={mutate}
                updateData={updateAppConfigData}
              />
              <CreationDenialModal
                onClose={onCloseCreationModal}
                visible={creationModalVisible}
              />
            </animated.div>
          ))}
        </div>
      )}
    />
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
