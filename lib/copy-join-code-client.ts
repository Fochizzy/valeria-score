import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'

import { copyJoinCodeWithFeedback as copyJoinCodeWithFeedbackCore } from './copy-join-code'
import { Alert } from './themed-alert'

export async function copyJoinCodeWithFeedback(joinCode: string | null | undefined) {
  return copyJoinCodeWithFeedbackCore(joinCode, {
    setClipboardString: Clipboard.setStringAsync,
    triggerSelectionFeedback: Haptics.selectionAsync,
    showAlert: (title, message) => Alert.alert(title, message),
  })
}
