import React, { useState, useCallback } from 'react'
import { ButtonBase, GU, useTheme, IconTrashcan } from '@pokt-foundation/ui'
import { CHAIN_ID_PREFIXES, prefixFromChainId } from '../../../lib/chain-utils'
import Card from '../../Card/Card'
import DropdownWithEdit from '../DropdownWithEdit/DropdownWithEdit'
import { getImageForChain } from '../../../known-chains/known-chains'
import WideTextCopy from '../WideTextCopy/WideTextCopy'

const NORMALIZED_CHAIN_ID_PREFIXES = Array.from(CHAIN_ID_PREFIXES.entries())

interface WhitelistCardWithDropdownNoInputProps {
  title: string
  value: string
  valueList: string[]
  onDelete: (value: string) => void
  onClick: (data: string) => void
  setValue: React.Dispatch<React.SetStateAction<string>>
  helpDescription: string
}

export default function WhitelistCardWithDropdownNoInput({
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
        height: ${valueList.length ? 'auto' : '75px'};
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
                  {getImageForChain(prefixFromChainId(value)?.name ?? '') && (
                    <img
                      src={getImageForChain(
                        prefixFromChainId(value)?.name ?? ''
                      )}
                      alt={value}
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
            </>
          )
        })}
      </ul>
    </Card>
  )
}
