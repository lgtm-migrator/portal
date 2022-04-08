import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useHistory } from 'react-router'
import { useMutation, useQueryClient } from 'react-query'
import amplitude from 'amplitude-js'
import axios from 'axios'
import styled from 'styled-components/macro'
import { UserLB } from '@pokt-foundation/portal-types'
import {
  Button,
  ButtonBase,
  IconPlus,
  Spacer,
  Split,
  Switch,
  TextCopy,
  TextInput,
  textStyle,
  useToast,
  GU,
  Dropdown,
  DropdownItem,
  useTheme,
  Help,
} from '@pokt-foundation/ui'
import * as Sentry from '@sentry/react'
import Card from '../../../components/Card/Card'
import FloatUp from '../../../components/FloatUp/FloatUp'
import env from '../../../environment'
import {
  KNOWN_MUTATION_SUFFIXES,
  KNOWN_QUERY_SUFFIXES,
} from '../../../known-query-suffixes'
import { sentryEnabled } from '../../../sentry'
import { AmplitudeEvents } from '../../../lib/analytics'
import {
  ChainMetadata,
  CHAIN_ID_PREFIXES,
  prefixFromChainId,
} from '../../../lib/chain-utils'
import { getImageForChain } from '../../../known-chains/known-chains'
import TrashIcon from '../../../assets/trash.svg'
import EditIcon from '../../../components/Icons/EditIcon/EditIcon'

const NORMALIZED_CHAIN_ID_PREFIXES = Array.from(CHAIN_ID_PREFIXES.entries())

const INPUT_ADORNMENT_SETTINGS = {
  width: 4.5 * GU,
  padding: GU,
}

const DROPDOWN_STYLE = (theme: any) => `
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

input {
  border: 1px solid ${theme.accent};
  height: 32px;
  width: '152px';
  font-size: 14px;
}

svg {
  height: 16px;
  width: 16px;
}
`

interface SecurityProps {
  appData: UserLB
  stakedTokens: number
  maxDailyRelays: number
}

type WhiteListBlockchain = {
  blockchainID: string
  data: string
}

export default function Security({
  appData,
  stakedTokens,
  maxDailyRelays,
}: SecurityProps) {
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
  }, [appData])

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
                <Card
                  css={`
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                    padding: ${GU * 3}px;
                  `}
                >
                  <div
                    css={`
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    `}
                  >
                    <h3
                      css={`
                        ${textStyle('title3')}
                      `}
                    >
                      Private Secret Key Required
                    </h3>
                  </div>
                  <Switch
                    checked={secretKeyRequired}
                    onChange={onSecretKeyRequiredChange}
                  />
                </Card>
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
              </>
            }
          />
        </>
      )}
    />
  )
}

interface WhitelistCardProps {
  title: string
  value: string
  valueList: string[]
  onDelete: (value: string) => void
  onClick: () => void
  setValue: React.Dispatch<React.SetStateAction<string>>
}

function WhitelistCard({
  title,
  value,
  valueList,
  onClick,
  onDelete,
  setValue,
}: WhitelistCardProps) {
  const theme = useTheme()
  const [editMode, setEditMode] = useState(false)

  const toggleEditMode = useCallback(
    () => setEditMode((prevEditMode) => !prevEditMode),
    []
  )

  return (
    <Card
      css={`
        padding: ${GU * 3}px;
      `}
    >
      <div
        css={`
          display: flex;
          justify-content: space-between;
        `}
      >
        <h3
          css={`
            ${textStyle('title3')};
            margin-bottom: ${2 * GU}px;
          `}
        >
          {title}
        </h3>
        <ButtonBase
          element="div"
          description="Preferences"
          label="Preferences"
          onClick={toggleEditMode}
          css={`
            background-color: ${editMode && theme.accent};
            border: 1px solid ${theme.accent};
            border-radius: ${GU - 4}px;
            width: ${4 * GU}px;
            height: ${4 * GU}px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            position: relative;
            margin-right: ${GU}px;
          `}
        >
          <EditIcon
            css={`
              width: ${GU * 2}px;
              height: ${GU * 2}px;
              color: ${editMode ? theme.contentInverted : theme.accent};
            `}
          />
        </ButtonBase>
      </div>
      <TextInput
        wide
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setValue(e.target.value)
        }
        adornment={
          <ButtonBase
            onClick={onClick}
            css={`
              && {
                display: flex;
              }
            `}
          >
            <IconPlus />
          </ButtonBase>
        }
        adornmentPosition="end"
        adornmentSettings={INPUT_ADORNMENT_SETTINGS}
        css={`
          background-color: ${theme.tableBorder};
        `}
      />
      <ul
        css={`
          list-style: none;
          margin-top: ${2 * GU}px;
          li:not(:last-child) {
            margin-bottom: ${2 * GU}px;
            padding-left: 0;
          }
        `}
      >
        {valueList.map((value, index) => (
          <li
            key={value}
            css={`
              display: flex;
              align-items: center;
            `}
          >
            <WideTextCopy key={`${value}/${index}`} value={value} />
            {editMode && (
              <ButtonBase
                element="div"
                description="Preferences"
                label="Preferences"
                onClick={() => onDelete(value)}
                css={`
                  background-color: ${theme.error};
                  border-radius: ${GU / 2}px;
                  width: ${4 * GU}px;
                  height: ${4 * GU}px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  color: white;
                  position: relative;
                  margin-left: ${GU}px;
                `}
              >
                <img
                  src={TrashIcon}
                  alt="edit"
                  css={`
                    width: ${GU * 2}px;
                    height: ${GU * 2}px;
                  `}
                />
              </ButtonBase>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

interface DropdownWithEditProps {
  title: string
  toggleEditMode: () => void
  editMode: boolean
  chainName: string
  handleToggle: () => void
  chains: [string, ChainMetadata][]
  opened: boolean
  setOpened: React.Dispatch<React.SetStateAction<boolean>>
  handleSelectChain: (v: string) => void
  handleChainsSearch: (v: string) => void
  helpDescription: string
}

function DropdownWithEdit({
  chainName,
  chains,
  editMode,
  handleToggle,
  title,
  toggleEditMode,
  opened,
  setOpened,
  handleChainsSearch,
  handleSelectChain,
  helpDescription,
}: DropdownWithEditProps) {
  const theme = useTheme()

  return (
    <div
      css={`
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: ${2 * GU}px;
      `}
    >
      <div
        css={`
          display: flex;
          align-items: center;
        `}
      >
        <h3
          css={`
            ${textStyle('title3')}
          `}
        >
          {title}
        </h3>
        <Help
          placement="right"
          css={`
            display: inline-flex;
            margin-left: ${GU / 2}px;
          `}
        >
          {helpDescription}
        </Help>
      </div>

      <div
        css={`
          display: flex;
        `}
      >
        <ButtonBase
          element="div"
          description="Preferences"
          label="Preferences"
          onClick={toggleEditMode}
          css={`
            background-color: ${editMode && theme.accent};
            border: 1px solid ${theme.accent};
            border-radius: ${GU - 4}px;
            width: ${4 * GU}px;
            height: ${4 * GU}px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            position: relative;
            margin-right: ${GU}px;
          `}
        >
          <EditIcon
            css={`
              width: ${GU * 2}px;
              height: ${GU * 2}px;
              color: ${editMode ? theme.contentInverted : theme.accent};
            `}
          />
        </ButtonBase>
        <Dropdown
          value={chainName}
          visible={opened}
          placeholder="Select Chain"
          handleToggle={handleToggle}
          onClose={() => setOpened(false)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChainsSearch(e.target.value)
          }
          css={DROPDOWN_STYLE(theme)}
        >
          {chains.length > 0 ? (
            chains.map(([k, v]) => (
              <>
                {v.evm && (
                  <DropdownItem
                    onClick={() => {
                      handleSelectChain(k)
                    }}
                    icon={getImageForChain(v.name)}
                    label={v.name}
                  />
                )}
              </>
            ))
          ) : (
            <DropdownItem label="No chains found with that name" />
          )}
        </Dropdown>
      </div>
    </div>
  )
}

interface WhitelistCardWithDropdownProps {
  title: string
  value: WhiteListBlockchain
  valueList: Map<string, string[]>
  onDelete: (value: string, key: string) => void
  onClick: () => void
  setValue: React.Dispatch<React.SetStateAction<WhiteListBlockchain>>
  helpDescription: string
}

function WhitelistCardWithDropdown({
  title,
  value,
  valueList,
  onClick,
  onDelete,
  setValue,
  helpDescription,
}: WhitelistCardWithDropdownProps) {
  const theme = useTheme()
  const [chains, setChains] = useState(NORMALIZED_CHAIN_ID_PREFIXES)
  const [opened, setOpened] = useState(false)
  const [chainName, setChainName] = useState('')
  const [chainID, setChainID] = useState('')
  const [editMode, setEditMode] = useState(false)

  const isInputDisabled = useMemo(() => chainName.length < 1, [chainName])
  const isAddBtnDisabled = useMemo(
    () => !value.blockchainID.length && !value.data.length,
    [value]
  )

  const toggleEditMode = useCallback(
    () => setEditMode((prevEditMode) => !prevEditMode),
    []
  )

  const handleToggle = useCallback(() => {
    setChainName('')
    setChains(NORMALIZED_CHAIN_ID_PREFIXES)
    setOpened((opened) => !opened)
  }, [])

  const handleSelectChain = useCallback((chainID: string) => {
    const chainData = prefixFromChainId(chainID)

    if (chainData) {
      const { name } = chainData

      setChainName(name)
      setChainID(chainID)
    }

    setOpened(false)
  }, [])

  const handleChainsSearch = useCallback((searchedChain: string) => {
    setChainName(searchedChain)

    if (searchedChain.length === 0) {
      setChains(NORMALIZED_CHAIN_ID_PREFIXES)
    }

    const tempChains = []

    for (const chain of NORMALIZED_CHAIN_ID_PREFIXES) {
      if (chain[1].name.toLowerCase().includes(searchedChain.toLowerCase())) {
        tempChains.push(chain)
      }
    }

    setChains(tempChains)
  }, [])

  return (
    <Card
      css={`
        padding: ${GU * 3}px;
      `}
    >
      <DropdownWithEdit
        chainName={chainName}
        title={title}
        opened={opened}
        setOpened={setOpened}
        chains={chains}
        editMode={editMode}
        toggleEditMode={toggleEditMode}
        handleChainsSearch={handleChainsSearch}
        handleSelectChain={handleSelectChain}
        handleToggle={handleToggle}
        helpDescription={helpDescription}
      />

      <TextInput
        wide
        value={value.data}
        disabled={isInputDisabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setValue({
            blockchainID: chainID,
            data: e.target.value,
          })
        }
        adornment={
          <ButtonBase
            disabled={isAddBtnDisabled}
            onClick={onClick}
            css={`
              && {
                display: flex;
              }
            `}
          >
            <IconPlus />
          </ButtonBase>
        }
        adornmentPosition="end"
        adornmentSettings={INPUT_ADORNMENT_SETTINGS}
        css={`
          background-color: ${theme.tableBorder};
        `}
      />
      <ul
        css={`
          list-style: none;
          margin-top: ${2 * GU}px;
          li:not(:last-child) {
            margin-bottom: ${2 * GU}px;
            padding-left: 0;
          }
        `}
      >
        {Array.from(valueList.entries())?.map((value) => {
          return (
            <>
              {value[1]?.map((internalValue, index) => (
                <li
                  key={`${internalValue}/${index}`}
                  css={`
                    display: flex;
                    align-items: center;
                  `}
                >
                  <div
                    css={`
                      width: ${GU * 9}px;
                      min-width: ${GU * 9}px;
                      height: ${GU * 5}px;
                      border-radius: ${GU - 4}px;
                      padding: 0;
                      white-space: nowrap;
                      border: 1px solid ${theme.contentBorder};
                      text-transform: uppercase;
                      padding: ${GU}px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      margin-right: ${GU}px;
                    `}
                  >
                    {getImageForChain(
                      prefixFromChainId(value[0])?.name ?? ''
                    ) && (
                      <img
                        src={getImageForChain(
                          prefixFromChainId(value[0])?.name ?? ''
                        )}
                        alt=""
                        css={`
                          width: ${GU * 2}px;
                          height: ${GU * 2}px;
                          margin-right: ${GU - 4}px;
                        `}
                      />
                    )}
                    <p
                      css={`
                        display: inline-block;
                        text-overflow: ellipsis;
                        overflow: hidden;
                        white-space: nowrap;
                        font-size: ${GU + 4}px;
                      `}
                    >
                      {prefixFromChainId(value[0])?.abbrv}
                    </p>
                  </div>
                  <WideTextCopy
                    key={`${internalValue}/${index}`}
                    value={internalValue}
                  />
                  {editMode && (
                    <ButtonBase
                      element="div"
                      description="Preferences"
                      label="Preferences"
                      onClick={() => onDelete(internalValue, value[0])}
                      css={`
                        background-color: ${theme.error};
                        border-radius: ${GU / 2}px;
                        width: ${4 * GU}px;
                        height: ${4 * GU}px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: white;
                        position: relative;
                        margin-left: ${GU}px;
                      `}
                    >
                      <img
                        src={TrashIcon}
                        alt="edit"
                        css={`
                          width: ${GU * 2}px;
                          height: ${GU * 2}px;
                        `}
                      />
                    </ButtonBase>
                  )}
                </li>
              ))}
            </>
          )
        })}
      </ul>
    </Card>
  )
}

interface WhitelistCardWithDropdownNoInputProps {
  title: string
  value: string
  valueList: string[]
  onDelete: (value: string) => void
  onClick: (data: string) => void
  setValue: React.Dispatch<React.SetStateAction<string>>
  helpDescription: string
}

function WhitelistCardWithDropdownNoInput({
  title,
  value,
  valueList,
  onClick,
  onDelete,
  setValue,
  helpDescription,
}: WhitelistCardWithDropdownNoInputProps) {
  const theme = useTheme()
  const [chains, setChains] = useState(NORMALIZED_CHAIN_ID_PREFIXES)
  const [opened, setOpened] = useState(false)
  const [chainName, setChainName] = useState('')
  const [editMode, setEditMode] = useState(false)

  const toggleEditMode = useCallback(
    () => setEditMode((prevEditMode) => !prevEditMode),
    []
  )

  const handleToggle = useCallback(() => {
    setChainName('')
    setChains(NORMALIZED_CHAIN_ID_PREFIXES)
    setOpened((opened) => !opened)
  }, [])

  const handleSelectChain = useCallback(
    (chainID: string) => {
      const chainData = prefixFromChainId(chainID)

      if (chainData) {
        const { name } = chainData

        setChainName(name)
        setValue(chainID)
        onClick(chainID)
      }

      setOpened(false)
    },
    [setValue, onClick]
  )

  const handleChainsSearch = useCallback((searchedChain: string) => {
    setChainName(searchedChain)

    if (searchedChain.length === 0) {
      setChains(NORMALIZED_CHAIN_ID_PREFIXES)
    }

    const tempChains = []

    for (const chain of NORMALIZED_CHAIN_ID_PREFIXES) {
      if (chain[1].name.toLowerCase().includes(searchedChain.toLowerCase())) {
        tempChains.push(chain)
      }
    }

    setChains(tempChains)
  }, [])

  return (
    <Card
      css={`
        padding: ${GU * 3}px;
      `}
    >
      <DropdownWithEdit
        chainName={chainName}
        title={title}
        opened={opened}
        setOpened={setOpened}
        chains={chains}
        editMode={editMode}
        toggleEditMode={toggleEditMode}
        handleChainsSearch={handleChainsSearch}
        handleSelectChain={handleSelectChain}
        handleToggle={handleToggle}
        helpDescription={helpDescription}
      />
      <ul
        css={`
          list-style: none;
          margin-top: ${2 * GU}px;
          li:not(:last-child) {
            margin-bottom: ${2 * GU}px;
            padding-left: 0;
          }
        `}
      >
        {valueList.map((value, index) => {
          return (
            <>
              <li
                key={`${value}/${index}`}
                css={`
                  display: flex;
                  align-items: center;
                `}
              >
                <div
                  css={`
                    width: ${GU * 9}px;
                    min-width: ${GU * 9}px;
                    height: ${GU * 5}px;
                    border-radius: ${GU - 4}px;
                    padding: 0;
                    white-space: nowrap;
                    border: 1px solid ${theme.contentBorder};
                    text-transform: uppercase;
                    padding: ${GU}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: ${GU}px;
                  `}
                >
                  <img
                    src={getImageForChain(prefixFromChainId(value)?.name ?? '')}
                    alt={value}
                    css={`
                      width: ${GU * 2}px;
                      height: ${GU * 2}px;
                      margin-right: ${GU - 4}px;
                    `}
                  />

                  <p
                    css={`
                      display: inline-block;
                      text-overflow: ellipsis;
                      overflow: hidden;
                      white-space: nowrap;
                      font-size: ${GU + 4}px;
                    `}
                  >
                    {prefixFromChainId(value)?.abbrv}
                  </p>
                </div>
                <WideTextCopy
                  key={`${value}/${index}`}
                  value={`${value} - ${prefixFromChainId(value)?.name}`}
                />
                {editMode && (
                  <ButtonBase
                    element="div"
                    description="Preferences"
                    label="Preferences"
                    onClick={() => onDelete(value)}
                    css={`
                      background-color: ${theme.error};
                      border-radius: ${GU / 2}px;
                      width: ${4 * GU}px;
                      height: ${4 * GU}px;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      color: white;
                      position: relative;
                      margin-left: ${GU}px;
                    `}
                  >
                    <img
                      src={TrashIcon}
                      alt="edit"
                      css={`
                        width: ${GU * 2}px;
                        height: ${GU * 2}px;
                      `}
                    />
                  </ButtonBase>
                )}
              </li>
            </>
          )
        })}
      </ul>
    </Card>
  )
}

const WideTextCopy = styled(TextCopy)`
  && {
    width: 100%;
    padding-left: 0;
  }
`
