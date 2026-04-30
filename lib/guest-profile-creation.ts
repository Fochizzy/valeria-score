export class GuestProfileValidationError extends Error {}

function normalizeGuestPlayerId(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 20)
}

export function prepareGuestProfileCreationInput({
  displayName,
  playerId,
}: {
  displayName: string | null | undefined
  playerId: string | null | undefined
}) {
  const normalizedDisplayName = String(displayName ?? '').trim()
  const normalizedPlayerId = normalizeGuestPlayerId(String(playerId ?? ''))

  if (!normalizedDisplayName) {
    throw new GuestProfileValidationError('Enter a display name for the guest.')
  }

  if (!normalizedPlayerId) {
    throw new GuestProfileValidationError('Enter a Player ID for the guest.')
  }

  return {
    displayName: normalizedDisplayName,
    playerId: normalizedPlayerId,
  }
}
