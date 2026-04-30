export type PlayerKeyParts =
  | { type: 'user'; userId: string }
  | { type: 'guest'; guestProfileId: string }

export function parsePlayerKey(
  playerKey: string | null | undefined
): PlayerKeyParts | null {
  if (typeof playerKey !== 'string') return null
  if (playerKey.startsWith('user:')) {
    const userId = playerKey.slice(5)
    return userId ? { type: 'user', userId } : null
  }
  if (playerKey.startsWith('guest:')) {
    const guestProfileId = playerKey.slice(6)
    return guestProfileId ? { type: 'guest', guestProfileId } : null
  }
  return null
}
