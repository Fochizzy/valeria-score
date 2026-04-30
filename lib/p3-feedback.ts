export const sessionUiCopy = {
  joinCodeLabel: 'Join Code',
  savedLabel: 'Saved',
  liveTotalLabel: 'Live Total',
  lockedState: 'Locked',
  savedState: 'Saved',
} as const

type ScoreSaveFeedbackInput = {
  isGuestMode: boolean
  guestName?: string | null
  dukeName?: string | null
}

type DangerFlowKind =
  | 'deleteGuestProfile'
  | 'deleteOwnedGame'
  | 'removeMyHistory'
  | 'deleteAccount'
  | 'deleteSession'
  | 'finishGame'

export function buildScoreSaveFeedback({
  isGuestMode,
  guestName,
  dukeName,
}: ScoreSaveFeedbackInput) {
  const safeDukeName = dukeName?.trim() || 'this duke'

  return {
    title: 'Score Saved',
    body: isGuestMode
      ? `${guestName?.trim() || 'Guest score'} was saved for ${safeDukeName}. You can keep editing until the host locks the game.`
      : `Your score was saved for ${safeDukeName}. You can keep editing until the host locks the game.`,
    actionLabel: 'Compare Scores',
  }
}

export function buildDangerFlowCopy(kind: DangerFlowKind, label = '') {
  switch (kind) {
    case 'deleteGuestProfile':
      return {
        title: 'Delete Guest Profile?',
        body: `Delete ${label} and remove every saved score tied to that guest profile. This cannot be undone.`,
        confirmLabel: 'Delete Guest',
      }
    case 'deleteOwnedGame':
      return {
        title: 'Delete Game?',
        body: `Delete ${label} and remove the saved session scores, standings, and player entries tied to it. This cannot be undone.`,
        confirmLabel: 'Delete Game',
      }
    case 'removeMyHistory':
      return {
        title: 'Remove Me From All Games?',
        body: 'Completed recaps stay shared, but your player ID becomes Mx. Doe and your data is removed from your personal stats. Any unfinished participation is removed entirely.',
        confirmLabel: 'Remove Me',
      }
    case 'deleteAccount':
      return {
        title: 'Delete Account And Data?',
        body: 'This permanently deletes your account and profile. Completed games keep their shared recap, but your finished participation is replaced with Mx. Doe and your in-progress sessions are removed.',
        confirmLabel: 'Delete Account',
      }
    case 'deleteSession':
      return {
        title: 'Delete Session?',
        body: `Delete ${label} and remove the session scores, standings, and player entries tied to it. This cannot be undone.`,
        confirmLabel: 'Delete Session',
      }
    case 'finishGame':
      return {
        title: 'Finish Game?',
        body: 'This locks every saved score, ranks the table, marks the winner, and writes stats. Players will no longer be able to edit their scores afterward.',
        confirmLabel: 'Finish Game',
      }
  }
}
