import React, { useState, useMemo, useCallback, ChangeEvent } from 'react'
import {
  ButtonBase,
  IconPlus,
  IconTrashcan,
  TextInput,
  GU,
  useTheme,
} from '@pokt-foundation/ui'
import { CHAIN_ID_PREFIXES, prefixFromChainId } from '../../../lib/chain-utils'
import WideTextCopy from '../WideTextCopy/WideTextCopy'
import Card from '../../Card/Card'
import DropdownWithEdit from '../DropdownWithEdit/DropdownWithEdit'
import { getImageForChain } from '../../../known-chains/known-chains'

const NORMALIZED_CHAIN_ID_PREFIXES = Array.from(CHAIN_ID_PREFIXES.entries())

const INPUT_ADORNMENT_SETTINGS = {
  width: 4.5 * GU,
  padding: GU,
}

type WhiteListBlockchain = {
  blockchainID: string
  data: string
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

export default function WhitelistCardWithDropdown({
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
                      <IconTrashcan
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
