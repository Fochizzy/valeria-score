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
  // A guest seat is one with no real account behind it: it still carries guest
  // ids, or it is a detached row left with nothing but a name. player_name on
  // its own does not make a row a guest — add_player_to_session sets it on
  // rows owned by a registered player, and claim_guest_profile leaves it in
  // place when it converts a guest into one. Treating those as guests hid the
  // player's real Player ID and froze their name at the add-time snapshot.
  const isGuest = Boolean(
    row.guest_profile_id ||
      row.guest_entry_id ||
      (!row.owner_user_id && row.player_name)
  )
  const recapName = normalizeText(row.recap_player_name)
  const recapPlayerId = normalizeText(row.recap_player_id)
  const rowName = normalizeText(row.player_name)
  const profileName = normalizeText(profile?.display_name)
  const profilePlayerId = normalizeText(profile?.public_player_id)
  const guestProfileName = normalizeText(guestProfile?.display_name)
  const guestProfilePlayerId = normalizeText(guestProfile?.public_player_id)

  return {
    isGuest,
    label:
      recapName ||
      (isGuest
        ? rowName || guestProfileName || guestProfilePlayerId || 'Guest Player'
        : // Live profile wins over row.player_name, which is only the snapshot
          // taken when the seat was created. It stays as the last fallback for
          // rows whose profile has not been loaded.
          profileName || profilePlayerId || rowName || 'Player'),
    playerId:
      recapPlayerId ||
      (isGuest ? guestProfilePlayerId || null : profilePlayerId || null),
  }
}
