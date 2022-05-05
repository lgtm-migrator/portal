import React, { useState, useCallback, ChangeEvent } from 'react'
import {
  ButtonBase,
  IconPlus,
  IconPencil,
  IconTrashcan,
  TextInput,
  textStyle,
  GU,
  useTheme,
} from '@pokt-foundation/ui'
import Card from '../../Card/Card'
import WideTextCopy from '../WideTextCopy/WideTextCopy'

const INPUT_ADORNMENT_SETTINGS = {
  width: 4.5 * GU,
  padding: GU,
}

interface WhitelistCardProps {
  title: string
  value: string
  valueList: string[]
  onDelete: (value: string) => void
  onClick: () => void
  setValue: React.Dispatch<React.SetStateAction<string>>
}

export default function WhitelistCard({
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
      </ul>
    </Card>
  )
}
