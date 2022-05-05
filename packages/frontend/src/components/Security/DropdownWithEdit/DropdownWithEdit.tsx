import React from 'react'
import {
  ButtonBase,
  IconPencil,
  textStyle,
  GU,
  Dropdown,
  DropdownItem,
  useTheme,
  Help,
} from '@pokt-foundation/ui'
import { ChainMetadata } from '../../../lib/chain-utils'
import { getImageForChain } from '../../../known-chains/known-chains'

const DROPDOWN_STYLE = (theme: { [k: string]: string }) => `
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

export default function DropdownWithEdit({
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
          <IconPencil
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
