import { cards } from '../data/cards.ts'
import { buildCardsLookup } from './score-category-breakdown.ts'
import {
  buildAverageShapeOverTime,
  buildMetaSnapshot,
  buildTierList,
  type MetaSnapshot,
  type ShapeMonthEntry,
  type TierEntry,
} from './global-trends.ts'
import { supabase } from './supabase.ts'

type RawScoreRow = {
  duke_slug: string | null
  inputs: unknown
  score_total: number | null
  updated_at: string | null
}

type RawDukeStatsRow = {
  duke_slug: string | null
  games_played: number | null
  win_percentage: number | null
  avg_score: number | null
}

const cardsLookup = buildCardsLookup(cards)

async function loadTrackedScoreRows(): Promise<RawScoreRow[]> {
  const { data, error } = await supabase
    .from('session_scores')
    .select('duke_slug, inputs, score_total, updated_at')
    .eq('game_locked', true)
    .not('duke_slug', 'is', null)
    .neq('duke_slug', 'no-duke-selected')

  if (error) throw error
  return (data ?? []) as RawScoreRow[]
}

async function loadGlobalDukeStatsRows(): Promise<RawDukeStatsRow[]> {
  const { data, error } = await supabase
    .from('duke_global_stats')
    .select('duke_slug, games_played, win_percentage, avg_score')

  if (error) throw error
  return (data ?? []) as RawDukeStatsRow[]
}

export type GlobalTrendsBundle = {
  meta: MetaSnapshot
  tierList: TierEntry[]
  shapeOverTime: ShapeMonthEntry[]
}

export async function loadGlobalTrendsBundle(): Promise<GlobalTrendsBundle> {
  const [scoreRows, dukeRows] = await Promise.all([
    loadTrackedScoreRows(),
    loadGlobalDukeStatsRows(),
  ])

  const metaInput = scoreRows.map((row) => ({
    duke_slug: row.duke_slug ?? '',
    total_score: Number(row.score_total ?? 0),
    updated_at: row.updated_at ?? '',
  }))

  const meta = buildMetaSnapshot(metaInput, { windowDays: 7 })

  const tierList = buildTierList(
    dukeRows.map((row) => ({
      duke_slug: row.duke_slug ?? '',
      games_played: Number(row.games_played ?? 0),
      win_percentage: Number(row.win_percentage ?? 0),
      avg_score: Number(row.avg_score ?? 0),
    }))
  )

  const shapeOverTime = buildAverageShapeOverTime(
    scoreRows.map((row) => ({
      duke_slug: row.duke_slug ?? '',
      inputs: row.inputs,
      updated_at: row.updated_at ?? '',
    })),
    cardsLookup
  )

  return { meta, tierList, shapeOverTime }
}
