import React from 'react'
import { GU, RADIUS, useTheme } from '@pokt-foundation/ui'

interface CardProps {
  children: React.ReactNode
}

export default function Card({ children, ...props }: CardProps) {
  const theme = useTheme()

  return (
    <div
      css={`
        background: ${theme.backgroundAlternative};
        border-radius: ${RADIUS + 2}px;
        padding-top: ${GU * 3}px;
        padding-bottom: ${GU * 3}px;
      `}
      {...props}
    >
      {children}
    </div>
  )
}
