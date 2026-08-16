import { formatDukeName } from './duke-names.ts'

export type HistoryExportSessionScoreRow = {
  session_id: string
  player_name: string | null
  recap_player_name?: string | null
  recap_player_id?: string | null
  duke_slug: string | null
  score_total: number | null
  placement: number | null
  is_winner: boolean | null
}

export type HistoryExportSessionGame = {
  id: string
  joinCode: string | null
  finishedAt: string | null
}

export type HistoryExportSoloGame = {
  playerDukeSlug: string
  darkLordDukeSlug: string
  winner: 'player' | 'dark_lord'
  playerTotal: number
  darkLordTotal: number
  createdAt: string | null
  updatedAt: string | null
}

export const HISTORY_EXPORT_HEADER = [
  'game_type',
  'finished_at',
  'join_code',
  'player',
  'player_id',
  'duke',
  'total_score',
  'placement',
  'winner',
] as const

export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value)

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function toCsvLine(fields: readonly (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',')
}

function toDateOnly(value: string | null | undefined): string {
  if (!value) return ''

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString().slice(0, 10)
}

/**
 * Flatten finished multiplayer games (one row per seat) and solo games
 * (one row per side) into a spreadsheet-friendly CSV.
 */
export function buildHistoryExportCsv({
  sessionGames,
  scoreRowsBySession,
  soloGames,
}: {
  sessionGames: readonly HistoryExportSessionGame[]
  scoreRowsBySession: ReadonlyMap<string, readonly HistoryExportSessionScoreRow[]>
  soloGames: readonly HistoryExportSoloGame[]
}): string {
  const lines: string[] = [toCsvLine(HISTORY_EXPORT_HEADER)]

  for (const game of sessionGames) {
    const scoreRows = scoreRowsBySession.get(game.id) ?? []

    for (const row of scoreRows) {
      lines.push(
        toCsvLine([
          'multiplayer',
          toDateOnly(game.finishedAt),
          game.joinCode ?? '',
          row.recap_player_name ?? row.player_name ?? 'Player',
          row.recap_player_id ?? '',
          row.duke_slug ? formatDukeName(row.duke_slug) : '',
          row.score_total ?? 0,
          row.placement ?? '',
          row.is_winner ? 'yes' : 'no',
        ])
      )
    }
  }

  for (const game of soloGames) {
    const finishedAt = toDateOnly(game.updatedAt ?? game.createdAt)

    lines.push(
      toCsvLine([
        'solo',
        finishedAt,
        '',
        'You',
        '',
        formatDukeName(game.playerDukeSlug),
        game.playerTotal,
        '',
        game.winner === 'player' ? 'yes' : 'no',
      ])
    )

    lines.push(
      toCsvLine([
        'solo',
        finishedAt,
        '',
        'Dark Lord',
        '',
        formatDukeName(game.darkLordDukeSlug),
        game.darkLordTotal,
        '',
        game.winner === 'dark_lord' ? 'yes' : 'no',
      ])
    )
  }

  return lines.join('\r\n')
}

export function buildHistoryExportFileName(nowIso: string): string {
  const datePart = toDateOnly(nowIso) || 'export'
  return `valeria-score-history-${datePart}.csv`
}
