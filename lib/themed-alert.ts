import { Alert as NativeAlert } from 'react-native'
import { enqueueThemedAlert, hasThemedAlertListeners } from './themed-alert-state'

export type AppAlertButton = {
  text?: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

export type AppAlertOptions = {
  cancelable?: boolean
  onDismiss?: () => void
}

export const Alert = Object.freeze({
  alert(
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions
  ) {
    if (!hasThemedAlertListeners()) {
      NativeAlert.alert(title, message, buttons, options)
      return
    }

    enqueueThemedAlert({
      title,
      message,
      buttons: buttons?.map((button) => ({
        text: button.text ?? '',
        style: button.style,
        onPress: button.onPress,
      })),
      options,
    })
  },
})
