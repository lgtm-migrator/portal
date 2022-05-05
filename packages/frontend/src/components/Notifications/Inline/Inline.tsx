import React from 'react'
import { useViewport } from 'use-viewport'
import { GU } from '@pokt-foundation/ui'

interface InlineProps {
  children: React.ReactNode
}

export default function Inline({ children }: InlineProps) {
  const { within } = useViewport()
  const compactMode = within(-1, 'medium')

  return (
    <div
      css={`
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        margin: 0 ${5 * GU}px;
        ${compactMode &&
        `
            flex-direction: column;
            align-items: ${compactMode ? `center` : `flex-start`};
          `}
      `}
    >
      {children}
    </div>
  )
}
