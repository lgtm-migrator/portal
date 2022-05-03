import React from 'react'
import { Switch, textStyle, GU } from '@pokt-foundation/ui'
import Card from '../../Card/Card'

interface SecretKeyProps {
  required: boolean
  onChange: () => void
}

export default function SecretKey({ onChange, required }: SecretKeyProps) {
  return (
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
      <Switch checked={required} onChange={onChange} />
    </Card>
  )
}
