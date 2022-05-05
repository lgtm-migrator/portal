import { useHistory } from 'react-router-dom'
import { Button, Spacer, GU } from '@pokt-foundation/ui'

interface NavigationOptionsProps {
  onChangeSave: () => void
  disabled: boolean
}

export default function NavigationOptions({
  onChangeSave,
  disabled,
}: NavigationOptionsProps) {
  const history = useHistory()

  return (
    <>
      <Button wide onClick={onChangeSave} disabled={disabled}>
        Save changes
      </Button>
      <Spacer size={2 * GU} />
      <Button wide onClick={() => history.goBack()}>
        Back to application
      </Button>
    </>
  )
}
