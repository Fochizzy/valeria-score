export type PushTokenRow = {
  token: string
  user_id: string
}

export type FinishedGamePush = {
  to: string
  title: string
  body: string
  sound: 'default'
  channelId: 'default'
  data: {
    sessionId: string
    joinCode: string
  }
}

export const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
export const EXPO_PUSH_CHUNK_SIZE = 100

/**
 * Everyone with a saved seat except the person who pressed Finish.
 */
export function selectRecipientUserIds(
  ownerUserIds: readonly (string | null)[],
  finisherUserId: string
): string[] {
  const unique = new Set<string>()

  for (const ownerId of ownerUserIds) {
    if (ownerId && ownerId !== finisherUserId) {
      unique.add(ownerId)
    }
  }

  return [...unique]
}

export function buildFinishedGamePushes(
  tokens: readonly PushTokenRow[],
  args: { sessionId: string; joinCode: string }
): FinishedGamePush[] {
  const seen = new Set<string>()
  const pushes: FinishedGamePush[] = []

  for (const row of tokens) {
    if (!row.token || seen.has(row.token)) continue
    seen.add(row.token)

    pushes.push({
      to: row.token,
      title: 'Game finished!',
      body: 'Final scores are locked in. Open the recap to see who took the crown.',
      sound: 'default',
      channelId: 'default',
      data: {
        sessionId: args.sessionId,
        joinCode: args.joinCode,
      },
    })
  }

  return pushes
}

export function chunkPushes<T>(items: readonly T[], size = EXPO_PUSH_CHUNK_SIZE): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}
