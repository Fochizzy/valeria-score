function normalizeDisplayName(displayName: string | null | undefined) {
  return typeof displayName === 'string' ? displayName.trim() : ''
}

function normalizePlayerId(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 20)
}

export function resolveGuestProfileDisplayName(
  displayName: string | null | undefined,
  publicPlayerId: string
) {
  const normalizedPlayerId = normalizePlayerId(publicPlayerId)

  if (!normalizedPlayerId) {
    throw new Error('Missing Player ID')
  }

  return normalizeDisplayName(displayName) || normalizedPlayerId
}

export function getGuestProfileLabels(
  displayName: string | null | undefined,
  publicPlayerId: string | null | undefined
) {
  const normalizedDisplayName = normalizeDisplayName(displayName)
  const normalizedPlayerId = normalizePlayerId(publicPlayerId ?? '')

  if (
    normalizedDisplayName &&
    normalizedPlayerId &&
    normalizedDisplayName.toUpperCase() !== normalizedPlayerId
  ) {
    return {
      title: normalizedDisplayName,
      subtitle: normalizedPlayerId,
    }
  }

  if (normalizedPlayerId) {
    return {
      title: normalizedPlayerId,
      subtitle: null,
    }
  }

  if (normalizedDisplayName) {
    return {
      title: normalizedDisplayName,
      subtitle: null,
    }
  }

  return {
    title: 'Guest Player',
    subtitle: null,
  }
}
