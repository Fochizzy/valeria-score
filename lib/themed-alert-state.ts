export type ThemedAlertButton = {
  text: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

export type ThemedAlertOptions = {
  cancelable?: boolean
  onDismiss?: () => void
}

export type ThemedAlertRequest = {
  id: number
  title: string
  message: string
  buttons: ThemedAlertButton[]
  options?: ThemedAlertOptions
}

type EnqueueThemedAlertInput = {
  title: string
  message?: string | null
  buttons?: ThemedAlertButton[] | null
  options?: ThemedAlertOptions
}

type ThemedAlertListener = (currentAlert: ThemedAlertRequest | null) => void

let nextAlertId = 1
const listeners = new Set<ThemedAlertListener>()
const queue: ThemedAlertRequest[] = []

function notifyListeners() {
  const currentAlert = getCurrentThemedAlert()
  listeners.forEach((listener) => listener(currentAlert))
}

export function normalizeThemedAlertButtons(buttons?: ThemedAlertButton[] | null) {
  if (!buttons?.length) {
    return [{ text: 'OK' }]
  }

  return buttons.map((button, index) => ({
    text: button.text?.trim() || (buttons.length === 1 && index === 0 ? 'OK' : `Option ${index + 1}`),
    style: button.style,
    onPress: button.onPress,
  }))
}

export function enqueueThemedAlert(input: EnqueueThemedAlertInput) {
  const request: ThemedAlertRequest = {
    id: nextAlertId++,
    title: input.title,
    message: String(input.message ?? ''),
    buttons: normalizeThemedAlertButtons(input.buttons),
    options: input.options,
  }

  queue.push(request)
  notifyListeners()
  return request
}

export function getCurrentThemedAlert() {
  return queue[0] ?? null
}

export function hasThemedAlertListeners() {
  return listeners.size > 0
}

export function dismissCurrentThemedAlert() {
  const currentAlert = queue.shift() ?? null
  notifyListeners()
  currentAlert?.options?.onDismiss?.()
  return currentAlert
}

export function pressCurrentThemedAlert(actionIndex: number) {
  const currentAlert = queue.shift() ?? null
  const action = currentAlert?.buttons[actionIndex]
  notifyListeners()
  action?.onPress?.()
  return currentAlert
}

export function subscribeToThemedAlert(listener: ThemedAlertListener) {
  listeners.add(listener)
  listener(getCurrentThemedAlert())

  return () => {
    listeners.delete(listener)
  }
}

export function clearThemedAlertQueue() {
  queue.length = 0
  notifyListeners()
}
