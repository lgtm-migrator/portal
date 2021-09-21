import React from 'react'
import { useViewport } from 'use-viewport'
import { Banner, Button, Modal, Spacer, GU } from '@pokt-foundation/ui'
import 'styled-components/macro'

export function SwitchInfoModal({ onClose, onSwitch, visible }) {
  const { within } = useViewport()

  const compactMode = within(-1, 'medium')

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      css={`
        & > div > div > div > div {
          padding: 0 !important;
        }
      `}
    >
      <div
        css={`
          max-width: ${87 * GU}px;
        `}
      >
        <Banner
          mode="info"
          title="Free tier applications can only change networks once a week"
        >
          <p>
            This action will change your endpoint URL, which means you'll need
            to update it across your apps to maintain service. The previous
            endpoint will remain available for 24 hours before it is unstaked.
          </p>
        </Banner>
        <Spacer size={3 * GU} />
        <p
          css={`
            ${!compactMode && `text-align: center;`}
          `}
        >
          Do you want to continue?
        </p>
        <Spacer size={3 * GU} />
        <div
          css={`
            display: flex;
            ${compactMode && `flex-direction: column-reverse;`}
            justify-content: center;
            align-items: center;
            padding-left: ${2 * GU}px;
            padding-right: ${2 * GU}px;
          `}
        >
          <Spacer size={6 * GU} />
          <Button onClick={onClose} wide>
            Cancel
          </Button>
          <Spacer size={6 * GU} />
          <Button mode="strong" wide onClick={onSwitch}>
            Switch chains
          </Button>
          <Spacer size={6 * GU} />
        </div>
        <Spacer size={4 * GU} />
      </div>
    </Modal>
  )
}

export function RemoveAppModal({ onClose, onRemove, visible }) {
  const { within } = useViewport()

  const compactMode = within(-1, 'medium')

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      css={`
        & > div > div > div > div {
          padding: 0 !important;
        }
      `}
    >
      <div
        css={`
          max-width: ${87 * GU}px;
        `}
      >
        <Banner mode="error" title="You're about to remove this application.">
          <p>
            Once you remove this application from the Portal, the endpoint
            associated with it will remain available for 24 hours before it is
            unstaked.
          </p>
          <Spacer size={3 * GU} />
          <div
            css={`
              display: flex;
              ${compactMode && `flex-direction: column-reverse;`}
              justify-content: center;
              align-items: center;
            `}
          >
            <Button wide onClick={onRemove}>
              Remove
            </Button>
          </div>
        </Banner>
      </div>
    </Modal>
  )
}

export function SwitchDenialModal({ onClose, visible }) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      css={`
        & > div > div > div > div {
          padding: 0 !important;
        }
      `}
    >
      <div
        css={`
          max-width: ${87 * GU}px;
        `}
      >
        <Banner mode="warning" title="You've already switched chains this week">
          Once a week has elapsed you will be able to switch chains again. In
          the interim, we invite you to join our Discord community.
        </Banner>
      </div>
    </Modal>
  )
}
