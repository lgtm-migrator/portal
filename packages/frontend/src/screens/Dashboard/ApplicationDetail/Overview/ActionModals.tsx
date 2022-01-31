import { useViewport } from 'use-viewport'
import { Banner, Button, Modal, Spacer, GU } from '@pokt-foundation/ui'
import 'styled-components/macro'

interface ModalProps {
  onClose: () => void
  visible: boolean
}

interface RemoveAppModalProps extends ModalProps {
  onRemove: () => void
}

export function RemoveAppModal({
  onClose,
  onRemove,
  visible,
}: RemoveAppModalProps) {
  const { within } = useViewport()

  const compactMode = within(-1, 'medium')

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      width={compactMode ? '300px' : '696px'}
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
            `}
          >
            <Button
              onClick={onClose}
              css={`
                && {
                  width: ${29 * GU}px;
                }
              `}
            >
              Cancel
            </Button>
            <Spacer size={6 * GU} />
            <Button
              mode="primary"
              onClick={onRemove}
              css={`
                && {
                  width: ${29 * GU}px;
                }
              `}
            >
              Remove
            </Button>
          </div>
        </Banner>
      </div>
    </Modal>
  )
}
