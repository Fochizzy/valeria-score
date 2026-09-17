export type ManageAccountMenuActionId =
  | 'newSession'
  | 'manageData'
  | 'dukeStatistics'
  | 'playerStatistics'
  | 'globalTrends'
  | 'soloStatistics'
  | 'about'
  | 'logout'
  | 'deleteSession'
  | 'cancel'

export type ManageAccountMenuAction = {
  id: ManageAccountMenuActionId
  text: string
  style?: 'default' | 'cancel' | 'destructive'
}

export type ManageAccountModalAction = ManageAccountMenuAction & {
  onPress?: () => void
  disabled?: boolean
}

export type BoundManageAccountMenuHandlers = {
  onManageData: () => void
  onNewSession: () => void
  onLogout: () => void
  onDeleteSession?: () => void
  onDukeStatistics?: () => void
  onPlayerStatistics?: () => void
  onGlobalTrends?: () => void
  onSoloStatistics?: () => void
  onAbout?: () => void
}

export const manageAccountAlertCopy = Object.freeze({
  title: 'Go to',
  message: 'Jump to another part of the app.',
})

export const manageAccountModalPalette = Object.freeze({
  backdrop: 'rgba(7, 10, 24, 0.76)',
  surface: 'rgba(62, 39, 126, 0.98)',
  surfaceRaised: 'rgba(75, 48, 146, 0.98)',
  border: 'rgba(100, 168, 255, 0.42)',
  text: '#64A8FF',
})

export const manageAccountHeaderProps = Object.freeze({
  rightLabel: 'Navigation',
  rightLabelLines: 2,
  rightSlotWidth: 148,
  rightButtonVariant: 'tall' as const,
})

export function buildManageAccountMenuActions(
  options: { includeDeleteSession?: boolean } = {}
): ManageAccountMenuAction[] {
  // Logout is intentionally last so the destructive action sits at the bottom
  // of the modal, separated from the navigation actions above it.
  const actions: ManageAccountMenuAction[] = [
    { id: 'newSession', text: 'Game Hub' },
    { id: 'manageData', text: 'Manage Data' },
    { id: 'dukeStatistics', text: 'Duke Statistics' },
    { id: 'playerStatistics', text: 'Player Statistics' },
    { id: 'globalTrends', text: 'Global Trends' },
    { id: 'soloStatistics', text: 'Solo Statistics' },
    { id: 'about', text: 'About' },
  ]

  if (options.includeDeleteSession) {
    actions.push({
      id: 'deleteSession',
      text: 'Delete Session',
      style: 'destructive',
    })
  }

  // Logout uses the destructive style so the modal renders it with the red
  // outline treatment defined in the modal component.
  actions.push({ id: 'logout', text: 'Logout', style: 'destructive' })

  return actions
}

export function buildBoundManageAccountMenuActions(
  handlers: BoundManageAccountMenuHandlers,
  options: { includeDeleteSession?: boolean } = {}
): ManageAccountModalAction[] {
  const actions: ManageAccountModalAction[] = []

  for (const action of buildManageAccountMenuActions(options)) {
    switch (action.id) {
      case 'manageData':
        actions.push({ ...action, onPress: handlers.onManageData })
        break
      case 'newSession':
        actions.push({ ...action, onPress: handlers.onNewSession })
        break
      case 'dukeStatistics':
        if (handlers.onDukeStatistics) {
          actions.push({ ...action, onPress: handlers.onDukeStatistics })
        }
        break
      case 'playerStatistics':
        if (handlers.onPlayerStatistics) {
          actions.push({ ...action, onPress: handlers.onPlayerStatistics })
        }
        break
      case 'globalTrends':
        if (handlers.onGlobalTrends) {
          actions.push({ ...action, onPress: handlers.onGlobalTrends })
        }
        break
      case 'soloStatistics':
        if (handlers.onSoloStatistics) {
          actions.push({ ...action, onPress: handlers.onSoloStatistics })
        }
        break
      case 'about':
        if (handlers.onAbout) {
          actions.push({ ...action, onPress: handlers.onAbout })
        }
        break
      case 'logout':
        actions.push({ ...action, onPress: handlers.onLogout })
        break
      case 'deleteSession':
        if (handlers.onDeleteSession) {
          actions.push({ ...action, onPress: handlers.onDeleteSession })
        }
        break
      case 'cancel':
        // Cancel was removed from the modal flow — the X close button in the
        // top-right of the modal replaces it. We keep the case to handle any
        // legacy callers that still emit a 'cancel' action via the union type.
        actions.push({ ...action })
        break
      default:
        actions.push(action)
    }
  }

  return actions
}
