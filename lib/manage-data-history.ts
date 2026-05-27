import type { SoloGameResultRow } from './solo-stats.ts'

export type CompletedSessionHistorySource = {
  id: string
  join_code: string | null
  created_at?: string | null
  updated_at?: string | null
  is_host: boolean
}

export type ManageDataSessionHistoryItem = {
  kind: 'session'
  id: string
  joinCode: string | null
  createdAt: string | null
  updatedAt: string | null
  isHost: boolean
}

export type ManageDataSoloHistoryItem = {
  kind: 'solo'
  id: string
  createdAt: string | null
  updatedAt: string | null
  playerDukeSlug: string | null
  darkLordDukeSlug: string | null
  victoryCondition: SoloGameResultRow['victoryCondition']
  winner: SoloGameResultRow['winner']
  resolution: SoloGameResultRow['resolution']
}

export type ManageDataHistoryItem =
  | ManageDataSessionHistoryItem
  | ManageDataSoloHistoryItem

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function sortTimestamp(item: ManageDataHistoryItem) {
  return toTimestamp(item.updatedAt ?? item.createdAt)
}

export function buildManageDataHistoryItems({
  completedSessions,
  soloResults,
}: {
  completedSessions: CompletedSessionHistorySource[]
  soloResults: SoloGameResultRow[]
}): ManageDataHistoryItem[] {
  const items: ManageDataHistoryItem[] = [
    ...completedSessions.map((session) => ({
      kind: 'session' as const,
      id: session.id,
      joinCode: session.join_code ?? null,
      createdAt: session.created_at ?? null,
      updatedAt: session.updated_at ?? null,
      isHost: session.is_host,
    })),
    ...soloResults.map((result) => ({
      kind: 'solo' as const,
      id: result.id ?? '',
      createdAt: result.createdAt ?? null,
      updatedAt: result.updatedAt ?? null,
      playerDukeSlug: result.playerDukeSlug,
      darkLordDukeSlug: result.darkLordDukeSlug,
      victoryCondition: result.victoryCondition,
      winner: result.winner,
      resolution: result.resolution,
    })),
  ]

  return items.sort((a, b) => {
    const timestampDiff = sortTimestamp(b) - sortTimestamp(a)
    if (timestampDiff !== 0) return timestampDiff
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    return a.id.localeCompare(b.id)
  })
}
