import {
  buildDukeInputProfileState,
  type DukeInputProfileRow,
} from './duke-input-analytics.ts'
import type { ResolvedDukeStatsRow } from './duke-stats-data.ts'

type BuildDukeStatsScreenStateInput = {
  rows: ResolvedDukeStatsRow[]
  search: string
  selectedDukeSlug: string | null
  detailRows: DukeInputProfileRow[]
  detailDukeSlug: string | null
  detailError: string | null
  detailLoading: boolean
  minimumWinningSample?: number
}

function filterRows(rows: ResolvedDukeStatsRow[], search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return rows

  return rows.filter((row) => {
    return (
      row.duke_name.toLowerCase().includes(query) ||
      row.duke_slug.toLowerCase().includes(query) ||
      row.most_wins_player_name.toLowerCase().includes(query) ||
      row.best_avg_player_name.toLowerCase().includes(query)
    )
  })
}

function resolveSelectedRow(
  rows: ResolvedDukeStatsRow[],
  selectedDukeSlug: string | null
) {
  if (selectedDukeSlug) {
    const matchingRow = rows.find((row) => row.duke_slug === selectedDukeSlug)
    if (matchingRow) return matchingRow
  }

  return rows[0] ?? null
}

export function buildDukeStatsScreenState({
  rows,
  search,
  selectedDukeSlug,
  detailRows,
  detailDukeSlug,
  detailError,
  detailLoading,
  minimumWinningSample = 3,
}: BuildDukeStatsScreenStateInput) {
  const filteredRows = filterRows(rows, search)
  const selectedRow = resolveSelectedRow(filteredRows, selectedDukeSlug)
  const resolvedSelectedDukeSlug = selectedRow?.duke_slug ?? null
  const matchingDetailRows =
    resolvedSelectedDukeSlug && detailDukeSlug === resolvedSelectedDukeSlug
      ? detailRows
      : []

  return {
    filteredRows,
    selectedRow,
    selectedDukeSlug: resolvedSelectedDukeSlug,
    detailLoading:
      Boolean(resolvedSelectedDukeSlug) &&
      detailLoading &&
      (!detailDukeSlug || detailDukeSlug === resolvedSelectedDukeSlug),
    detailError:
      detailDukeSlug === resolvedSelectedDukeSlug ? String(detailError ?? '') : '',
    detailState: selectedRow
      ? buildDukeInputProfileState(matchingDetailRows, minimumWinningSample)
      : null,
  }
}
