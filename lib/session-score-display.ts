type SessionScoreIdentityRow = {
  owner_user_id: string | null
  player_name: string | null
  guest_profile_id: string | null
  guest_entry_id: string | null
  recap_player_name?: string | null
  recap_player_id?: string | null
}

type SessionScoreIdentityProfile = {
  display_name: string | null
  public_player_id: string | null
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

export function resolveSessionScoreDisplayIdentity(input: {
  row: SessionScoreIdentityRow
  profile?: SessionScoreIdentityProfile | null
  guestProfile?: SessionScoreIdentityProfile | null
}) {
  const { row, profile, guestProfile } = input
  const isGuest = Boolean(
    row.guest_profile_id || row.guest_entry_id || row.player_name
  )
  const recapName = normalizeText(row.recap_player_name)
  const recapPlayerId = normalizeText(row.recap_player_id)
  const guestName = normalizeText(row.player_name)
  const profileName = normalizeText(profile?.display_name)
  const profilePlayerId = normalizeText(profile?.public_player_id)
  const guestProfileName = normalizeText(guestProfile?.display_name)
  const guestProfilePlayerId = normalizeText(guestProfile?.public_player_id)

  return {
    isGuest,
    label:
      recapName ||
      (isGuest
        ? guestName || guestProfileName || guestProfilePlayerId || 'Guest Player'
        : profileName || profilePlayerId || 'Player'),
    playerId:
      recapPlayerId ||
      (isGuest ? guestProfilePlayerId || null : profilePlayerId || null),
  }
}
