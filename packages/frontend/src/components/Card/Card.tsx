import React from 'react'
import { GU, RADIUS } from '@pokt-foundation/ui'

interface CardProps {
  children: React.ReactNode
}

export default function Card({ children, ...props }: CardProps) {
  return (
    <div
      css={`
        background: #192430;
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
