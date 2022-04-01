import React from 'react'
import { useTheme, textStyle, GU } from '@pokt-foundation/ui'

interface MessagePopupProps {
  children: React.ReactNode
  show: boolean
}

export default function MessagePopup({
  children,
  show,
  ...props
}: MessagePopupProps) {
  const theme = useTheme()

  return (
    <React.Fragment>
      {show && (
        <div
          css={`
            border: 0;
            ${textStyle('body3')};
            background: white;
            color: ${theme.contentInverted};
            position: absolute;
            top: 0;
            left: 0;
            z-index: 9999;
            height: ${GU * 4}px;
            width: ${GU * 30}px;
            border-radius: ${GU - 4}px;

            &:before {
              content: ' ';
              position: absolute;
              width: 12px;
              height: 6px;
              left: auto;
              right: 16px;
              top: ${GU * 4}px;
              bottom: -40px;
              border: 10px solid;
              border-color: ${theme.helpContent} transparent transparent;
            }
          `}
          {...props}
        >
          <div
            css={`
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100%;
              width: 100%;
            `}
          >
            {children}
          </div>
        </div>
      )}
    </React.Fragment>
  )
}
