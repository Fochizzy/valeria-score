import { useEffect, useState } from 'react'
import ActionDialogModal, { type ActionDialogModalAction } from './ActionDialogModal'
import {
  dismissCurrentThemedAlert,
  pressCurrentThemedAlert,
  subscribeToThemedAlert,
  type ThemedAlertRequest,
} from '../lib/themed-alert-state'

function buildActionId(alertId: number, index: number) {
  return `alert-${alertId}-action-${index}`
}

export default function ThemedAlertHost() {
  const [currentAlert, setCurrentAlert] = useState<ThemedAlertRequest | null>(null)

  useEffect(() => subscribeToThemedAlert(setCurrentAlert), [])

  const actions: ActionDialogModalAction[] = (currentAlert?.buttons ?? []).map(
    (button, index) => ({
      id: buildActionId(currentAlert?.id ?? 0, index),
      text: button.text,
      style: button.style,
      onPress: () => pressCurrentThemedAlert(index),
    })
  )

  return (
    <ActionDialogModal
      visible={Boolean(currentAlert)}
      kicker="Notice"
      title={currentAlert?.title ?? ''}
      message={currentAlert?.message ?? ''}
      actions={actions}
      dismissible={Boolean(currentAlert?.options?.cancelable)}
      onRequestClose={dismissCurrentThemedAlert}
    />
  )
}
