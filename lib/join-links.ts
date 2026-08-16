export const JOIN_LINK_SCHEME = 'valeriascore'

export function normalizeJoinCode(raw: string | null | undefined): string {
  if (!raw) return ''

  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)
}

export function isCompleteJoinCode(code: string | null | undefined): boolean {
  return normalizeJoinCode(code).length === 6
}

/**
 * Deep link encoded into the table QR code. Scanning it (or tapping it in a
 * message) opens the app straight into the join flow for this session.
 */
export function buildJoinUrl(joinCode: string): string {
  const normalized = normalizeJoinCode(joinCode)

  if (normalized.length !== 6) {
    return ''
  }

  return `${JOIN_LINK_SCHEME}://join/${normalized}`
}

/**
 * Pull a join code out of a scanned/tapped URL. Accepts the app scheme form
 * (valeriascore://join/ABC123) and bare router paths (/join/ABC123).
 */
export function extractJoinCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null

  const match = /(?:^|\/)join\/([A-Za-z0-9]{6})(?:[/?#]|$)/.exec(url)

  if (!match) {
    return null
  }

  return normalizeJoinCode(match[1])
}
