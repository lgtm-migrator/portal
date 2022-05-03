import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { useMutation, useQueryClient } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import { UserLB } from '@pokt-foundation/portal-types'
import {
  Button,
  Spacer,
  Split,
  textStyle,
  useToast,
  GU,
} from '@pokt-foundation/ui'
import * as Sentry from '@sentry/react'
import FloatUp from '../../../components/FloatUp/FloatUp'
import env from '../../../environment'
import {
  KNOWN_MUTATION_SUFFIXES,
  KNOWN_QUERY_SUFFIXES,
} from '../../../known-query-suffixes'
import { sentryEnabled } from '../../../sentry'
import { AmplitudeEvents } from '../../../lib/analytics'
import FeedbackBox from '../../../components/FeedbackBox/FeedbackBox'
import WhitelistCard from '../../../components/Security/WhitelistCard/WhitelistCard'
import WhitelistCardWithDropdown from '../../../components/Security/WhitelistCardWithDropdown/WhitelistCardWithDropdown'
import WhitelistCardWithDropdownNoInput from '../../../components/Security/WhitelistCardWithDropdownNoInput/WhitelistCardWithDropdownNoInput'
import SecretKey from '../../../components/Security/SecretKey/SecretKey'

interface SecurityProps {
  appData: UserLB
}

type WhiteListBlockchain = {
  blockchainID: string
  data: string
}

export default function Security({ appData }: SecurityProps) {
  const [origin, setOrigin] = useState('')
  const [origins, setOrigins] = useState<string[]>([])
  const [secretKeyRequired, setSecretKeyRequired] = useState(false)
  const [userAgent, setUserAgent] = useState('')
  const [userAgents, setUserAgents] = useState<string[]>([])
  const [contract, setContract] = useState<WhiteListBlockchain>({
    blockchainID: '',
    data: '',
  })
  const [contracts, setContracts] = useState<Map<string, string[]>>(
    new Map<string, string[]>()
  )
  const [method, setMethod] = useState<WhiteListBlockchain>({
    blockchainID: '',
    data: '',
  })
  const [methods, setMethods] = useState<Map<string, string[]>>(new Map())
  const [blockchain, setBlockchain] = useState('')
  const [blockchains, setBlockchains] = useState<string[]>([])
  const [hasChanged, setHasChanged] = useState(false)
  const history = useHistory()
  const toast = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!hasChanged) {
      setUserAgents((agents) => {
        const currentUserAgents = appData.gatewaySettings.whitelistUserAgents
          .length
          ? [...appData.gatewaySettings.whitelistUserAgents]
          : []

        const filteredStateUserAgents = agents.filter(
          (a) => !currentUserAgents.includes(a)
        )

        return [...currentUserAgents, ...filteredStateUserAgents]
      })
      setOrigins((origins) => {
        const currentOrigins = appData.gatewaySettings.whitelistOrigins.length
          ? [...appData.gatewaySettings.whitelistOrigins]
          : []

        const filteredStateOrigins = origins.filter(
          (o) => !currentOrigins.includes(o)
        )

        return [...currentOrigins, ...filteredStateOrigins]
      })
      setContracts((contracts) => {
        const currentContracts = new Map()

        if (appData.gatewaySettings?.whitelistContracts.length) {
          for (const contract of appData.gatewaySettings?.whitelistContracts) {
            currentContracts.set(contract.blockchainID, contract.contracts)
          }
        }

        const filteredContracts = new Map()

        for (const contract of contracts) {
          filteredContracts.set(
            contract[0],
            contract[1]?.filter(
              (c) => !currentContracts.get(contract[0].includes(c))
            )
          )
        }

        return new Map([...currentContracts, ...filteredContracts])
      })
      setMethods((methods) => {
        const currentMethods = new Map()

        if (appData.gatewaySettings?.whitelistMethods?.length) {
          for (const method of appData.gatewaySettings?.whitelistMethods) {
            currentMethods.set(method.blockchainID, method.methods)
          }
        }

        const filteredMethods = new Map()

        for (const method of methods) {
          filteredMethods.set(
            method[0],
            method[1]?.filter((m) => !currentMethods.get(method[0].includes(m)))
          )
        }

        return new Map([...currentMethods, ...filteredMethods])
      })
      setBlockchains((blockchains) => {
        const currentBlockchains = appData.gatewaySettings.whitelistBlockchains
          .length
          ? [...appData.gatewaySettings.whitelistBlockchains]
          : []

        const filteredStateBlockchains = blockchains.filter(
          (b) => !currentBlockchains.includes(b)
        )

        return [...currentBlockchains, ...filteredStateBlockchains]
      })
      setSecretKeyRequired(appData.gatewaySettings.secretKeyRequired)
    }
  }, [appData, hasChanged])

  const { mutate } = useMutation(async function updateApplicationSettings() {
    const path = `${env('BACKEND_URL')}/api/${'lb'}/${appData.id}`

    try {
      await axios.put(
        path,
        {
          gatewaySettings: {
            whitelistOrigins: origins,
            whitelistUserAgents: userAgents,
            whitelistContracts: Array.from(contracts, (item) => ({
              blockchainID: item[0],
              contracts: item[1],
            })),
            whitelistMethods: Array.from(methods, (item) => ({
              blockchainID: item[0],
              methods: item[1],
            })),
            secretKeyRequired,
            whitelistBlockchains: blockchains,
          },
        },
        {
          withCredentials: true,
        }
      )

      queryClient.invalidateQueries(KNOWN_QUERY_SUFFIXES.USER_APPS)

      if (env('PROD')) {
        amplitude
          .getInstance()
          .logEvent(AmplitudeEvents.SecuritySettingsUpdate, {
            endpointId: appData.id,
          })
      }

      toast('Security preferences updated')
      history.goBack()
    } catch (err) {
      if (sentryEnabled) {
        Sentry.configureScope((scope) => {
          scope.setTransactionName(
            `QUERY ${KNOWN_MUTATION_SUFFIXES.SECURITY_UPDATE_MUTATION}`
          )
        })
        Sentry.captureException(err)
      }
      throw err
    }
  })

  const onSecretKeyRequiredChange = useCallback(() => {
    setHasChanged(true)
    setSecretKeyRequired((r) => !r)
  }, [])
  const setWhitelistedUserAgent = useCallback(() => {
    if (userAgent) {
      setHasChanged(true)
      setUserAgents((userAgents) => [...userAgents, userAgent])
    }
    setUserAgent('')
  }, [userAgent])
  const setWhitelistedOrigin = useCallback(() => {
    if (origin) {
      setHasChanged(true)
      setOrigins((origins) => [...origins, origin])
    }
    setOrigin('')
  }, [origin])
  const setWhitelistContract = useCallback(() => {
    if (contract) {
      setHasChanged(true)
      setContracts((prevContracts) => {
        const prevContractsCopy = new Map(prevContracts)
        const blockchainContracts = prevContractsCopy.get(contract.blockchainID)

        if (blockchainContracts) {
          blockchainContracts.push(contract.data)
          prevContractsCopy.set(contract.blockchainID, [...blockchainContracts])
        } else {
          prevContractsCopy.set(contract.blockchainID, [contract.data])
        }

        return prevContractsCopy
      })
    }
    setContract({
      blockchainID: '',
      data: '',
    })
  }, [contract])
  const setWhitelistMethod = useCallback(() => {
    if (method) {
      setHasChanged(true)
      setMethods((prevMethods) => {
        const prevMethodsCopy = new Map(prevMethods)
        const blockchainMethods = prevMethodsCopy.get(method.blockchainID)

        if (blockchainMethods) {
          blockchainMethods.push(method.data)
          prevMethodsCopy.set(method.blockchainID, blockchainMethods)
        } else {
          prevMethodsCopy.set(method.blockchainID, [method.data])
        }

        return prevMethodsCopy
      })
    }
    setMethod({
      blockchainID: '',
      data: '',
    })
  }, [method])
  const setWhitelistedBlockchain = useCallback((blockchain: string) => {
    if (blockchain) {
      setHasChanged(true)
      setBlockchains((blockchains) =>
        Array.from(new Set([...blockchains, blockchain]))
      )
    }
    setBlockchain('')
  }, [])

  const onDeleteUserAgentClick = useCallback((userAgent) => {
    setHasChanged(true)
    setUserAgents((userAgents) => [
      ...userAgents.filter((u) => u !== userAgent),
    ])
  }, [])
  const onDeleteOriginClick = useCallback((origin) => {
    setHasChanged(true)
    setOrigins((origins) => [...origins.filter((o) => o !== origin)])
  }, [])
  const onDeleteContractClick = useCallback((value, key) => {
    setHasChanged(true)
    setContracts((contracts) => {
      const prevContracts = new Map(contracts)
      const contractToDeleteList = prevContracts.get(key)

      if (contractToDeleteList) {
        const filteredContractToDeleteList = contractToDeleteList.filter(
          (contract) => contract !== value
        )

        if (filteredContractToDeleteList.length) {
          prevContracts.set(key, filteredContractToDeleteList)
        } else {
          prevContracts.delete(key)
        }
      }

      return prevContracts
    })
  }, [])
  const onDeleteMethodClick = useCallback((value, key) => {
    setHasChanged(true)
    setMethods((methods) => {
      const prevMethods = new Map(methods)
      const methodToDeleteList = prevMethods.get(key)

      if (methodToDeleteList) {
        const filteredMethodToDeleteList = methodToDeleteList.filter(
          (method) => method !== value
        )

        if (filteredMethodToDeleteList.length) {
          prevMethods.set(key, filteredMethodToDeleteList)
        } else {
          prevMethods.delete(key)
        }
      }

      return prevMethods
    })
  }, [])
  const onDeleteBlockchainClick = useCallback((blockchain) => {
    setHasChanged(true)
    setBlockchains((blockchains) => [
      ...blockchains.filter((b) => b !== blockchain),
    ])
  }, [])

  const isSaveDisabled = useMemo(() => !hasChanged, [hasChanged])

  return (
    <FloatUp
      content={() => (
        <>
          <Split
            primary={
              <section
                css={`
                  margin-bottom: ${GU * 6}px;
                `}
              >
                <p
                  css={`
                    ${textStyle('body2')}
                  `}
                >
                  To maximize the security of your application, you should
                  activate the private secret key for all requests and enable
                  the use of whitelist user agents and origins.
                </p>
                <Spacer size={3 * GU} />
                <SecretKey
                  required={secretKeyRequired}
                  onChange={onSecretKeyRequiredChange}
                />
                <Spacer size={3 * GU} />
                <WhitelistCardWithDropdownNoInput
                  title="Approved Chains"
                  value={blockchain}
                  setValue={setBlockchain}
                  onClick={setWhitelistedBlockchain}
                  onDelete={onDeleteBlockchainClick}
                  valueList={blockchains}
                  helpDescription="By adding a chain, you will restrict your application's access to the chains added to the list."
                />
                <Spacer size={3 * GU} />
                <WhitelistCard
                  title="Whitelisted User-Agents"
                  value={userAgent}
                  setValue={setUserAgent}
                  onClick={setWhitelistedUserAgent}
                  onDelete={onDeleteUserAgentClick}
                  valueList={userAgents}
                />
                <Spacer size={3 * GU} />
                <WhitelistCard
                  title="Whitelisted Origins"
                  value={origin}
                  setValue={setOrigin}
                  onClick={setWhitelistedOrigin}
                  onDelete={onDeleteOriginClick}
                  valueList={origins}
                />
                <Spacer size={3 * GU} />
                <WhitelistCardWithDropdown
                  title="Approved Contracts"
                  value={contract}
                  setValue={setContract}
                  onClick={setWhitelistContract}
                  onDelete={onDeleteContractClick}
                  valueList={contracts}
                  helpDescription="By adding a contract you will restrict your application's access to a specific list of smart contract address. Note that this is only available to EVM compatible chains."
                />
                <Spacer size={3 * GU} />
                <WhitelistCardWithDropdown
                  title="Approved Methods"
                  value={method}
                  setValue={setMethod}
                  onClick={setWhitelistMethod}
                  onDelete={onDeleteMethodClick}
                  valueList={methods}
                  helpDescription="By adding a method you will restrict your application's access to a specific list of methods. Note that this is only available to EVM compatible chains."
                />
              </section>
            }
            secondary={
              <>
                <Button wide disabled={isSaveDisabled} onClick={mutate}>
                  Save Changes
                </Button>
                <Spacer size={2 * GU} />
                <Button wide onClick={() => history.goBack()}>
                  Go Back
                </Button>
                <Spacer size={2 * GU} />
                <FeedbackBox />
              </>
            }
          />
        </>
      )}
    />
  )
}
