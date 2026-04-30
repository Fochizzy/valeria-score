import type { Href } from 'expo-router'

export type BottomNavPath = '/score' | '/compare' | '/profile'

type BottomNavParams = {
  sessionId?: string | null
  joinCode?: string | null
  selectedSlug?: string | null
  guestMode?: string | null
  guestName?: string | null
  guestProfileId?: string | null
  guestEntryId?: string | null
}

function normalizeValue(value: string | null | undefined) {
  return String(value ?? '').trim()
}

export function buildBottomNavRoute(
  path: BottomNavPath,
  params: BottomNavParams
): Href {
  const routeParams: Record<string, string> = {
    sessionId: normalizeValue(params.sessionId),
    joinCode: normalizeValue(params.joinCode),
  }

  const selectedSlug = normalizeValue(params.selectedSlug)
  const guestMode = normalizeValue(params.guestMode)
  const guestName = normalizeValue(params.guestName)
  const guestProfileId = normalizeValue(params.guestProfileId)
  const guestEntryId = normalizeValue(params.guestEntryId)

  if (selectedSlug) routeParams.selectedSlug = selectedSlug
  if (guestMode) routeParams.guestMode = guestMode
  if (guestName) routeParams.guestName = guestName
  if (guestProfileId) routeParams.guestProfileId = guestProfileId
  if (guestEntryId) routeParams.guestEntryId = guestEntryId

  return {
    pathname: path,
    params: routeParams,
  } as Href
}
