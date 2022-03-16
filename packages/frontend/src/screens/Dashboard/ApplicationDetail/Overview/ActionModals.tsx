import { useViewport } from 'use-viewport'
import {
  Banner,
  Button,
  Modal,
  Spacer,
  GU,
  textStyle,
} from '@pokt-foundation/ui'
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

          > div {
            border-bottom-left-radius: 0px;
            border-bottom-right-radius: 0px;
          }
        `}
      >
        <Banner mode="error" title="You're about to remove this application.">
          <p>
            Once you remove this application from the Portal, the endpoint
            associated with it wont be able to send any relays.
          </p>
          <Spacer size={3 * GU} />
        </Banner>

        <div
          css={`
            background: #1e232d;
            ${compactMode ? `height: ${34 * GU}px;` : `height: ${21 * GU}px;`}
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          `}
        >
          <p
            css={`
              ${textStyle('body3')};
              margin-top: ${5 * GU}px;
            `}
          >
            Do you want to continue
          </p>
          <div
            css={`
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
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
        </div>
      </div>
    </Modal>
  )
}
