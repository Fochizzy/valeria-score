type CopyJoinCodeDependencies = {
  setClipboardString?: (value: string) => Promise<unknown> | unknown
  triggerSelectionFeedback?: () => Promise<unknown> | unknown
  showAlert?: (title: string, message: string) => Promise<unknown> | unknown
}

export async function copyJoinCodeWithFeedback(
  joinCode: string | null | undefined,
  dependencies: CopyJoinCodeDependencies = {}
) {
  const normalizedJoinCode = typeof joinCode === 'string' ? joinCode.trim() : ''

  if (!normalizedJoinCode) return false

  const { setClipboardString, triggerSelectionFeedback, showAlert } = dependencies

  if (!setClipboardString || !triggerSelectionFeedback || !showAlert) {
    throw new Error('copyJoinCodeWithFeedback requires clipboard, haptics, and alert handlers')
  }

  await setClipboardString(normalizedJoinCode)
  await triggerSelectionFeedback()
  await showAlert('Copied', 'Join code copied to clipboard.')

  return true
}
