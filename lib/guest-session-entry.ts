type BuildGuestSessionEntryInput = {
  sessionId: string
  ownerUserId: string
  guestProfileId: string
  displayName: string
}

type BuildGuestSessionEntryOptions = {
  guestEntryId?: string
  updatedAt?: string
}

function randomNibble(generateRandomNumber: () => number) {
  return Math.floor(generateRandomNumber() * 16)
}

export function createGuestEntryId(
  generateRandomNumber: () => number = Math.random
) {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'

  return template.replace(/[xy]/g, (character) => {
    const nibble = randomNibble(generateRandomNumber)

    if (character === 'x') {
      return nibble.toString(16)
    }

    return ((nibble & 0x3) | 0x8).toString(16)
  })
}

export function buildGuestSessionEntryPayload(
  input: BuildGuestSessionEntryInput,
  options: BuildGuestSessionEntryOptions = {}
) {
  return {
    session_id: input.sessionId,
    owner_user_id: input.ownerUserId,
    player_name: input.displayName,
    guest_profile_id: input.guestProfileId,
    guest_entry_id: options.guestEntryId ?? createGuestEntryId(),
    duke_slug: null,
    inputs: {},
    score_total: 0,
    game_locked: false,
    included_in_stats: false,
    updated_at: options.updatedAt ?? new Date().toISOString(),
  }
}
