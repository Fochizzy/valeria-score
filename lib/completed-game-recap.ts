import { cards, type StatKey } from '../data/cards.ts'
import { statMetaByKey } from '../data/statMeta.ts'
import { formatDukeName } from './duke-names.ts'
import { normalizeScoreInputs, calculateLineItems } from './scoring.ts'
import {
  resolveSessionScoreDisplayIdentity,
} from './session-score-display.ts'

type RecapIdentityProfile = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

export type CompletedGameRecapScoreRow = {
  id: string
  owner_user_id: string | null
  player_name: string | null
  guest_profile_id: string | null
  guest_entry_id: string | null
  recap_player_name?: string | null
  recap_player_id?: string | null
  duke_slug: string | null
  score_total: number | null
  placement: number | null
  is_winner: boolean | null
  inputs: Record<string, number> | null
}

export type CompletedGameRecapStat = {
  key: StatKey
  label: string
  icon: any
  input: number
  multiplier: number
  subtotal: number
  isDivision: boolean
  ruleText: string
}

export type CompletedGameRecapPlayer = {
  id: string
  label: string
  playerId: string | null
  isGuest: boolean
  totalScore: number
  placement: number | null
  isWinner: boolean
  dukeSlug: string | null
  dukeName: string
  stats: CompletedGameRecapStat[]
}

function buildRuleText(multiplier: number, isDivision: boolean) {
  return `${isDivision ? '÷' : '×'} ${multiplier}`
}

export function buildCompletedGameRecap(input: {
  scoreRows: CompletedGameRecapScoreRow[]
  profiles: RecapIdentityProfile[]
  guestProfiles: RecapIdentityProfile[]
}): CompletedGameRecapPlayer[] {
  const profileMap = new Map(input.profiles.map((profile) => [profile.id, profile]))
  const guestProfileMap = new Map(
    input.guestProfiles.map((profile) => [profile.id, profile])
  )

  return input.scoreRows
    .map((row) => {
      const profile = row.owner_user_id ? profileMap.get(row.owner_user_id) : undefined
      const guestProfile = row.guest_profile_id
        ? guestProfileMap.get(row.guest_profile_id)
        : undefined
      const identity = resolveSessionScoreDisplayIdentity({
        row,
        profile,
        guestProfile,
      })
      const duke = cards.find((card) => card.slug === row.duke_slug) ?? null
      const stats = duke
        ? calculateLineItems(duke, normalizeScoreInputs(row.inputs)).reduce<
            CompletedGameRecapStat[]
          >((items, lineItem) => {
            if (lineItem.multiplier <= 0) {
              return items
            }

            const meta = statMetaByKey[lineItem.key]

            if (!meta) {
              return items
            }

            items.push({
              key: lineItem.key,
              label: meta.label,
              icon: meta.icon,
              input: lineItem.input,
              multiplier: lineItem.multiplier,
              subtotal: lineItem.total,
              isDivision: lineItem.isDivision,
              ruleText: buildRuleText(lineItem.multiplier, lineItem.isDivision),
            })

            return items
          }, [])
        : []

      return {
        id: row.id,
        label: identity.label,
        playerId: identity.playerId,
        isGuest: identity.isGuest,
        totalScore: Number(row.score_total || 0),
        placement: row.placement ?? null,
        isWinner: Boolean(row.is_winner),
        dukeSlug: row.duke_slug ?? null,
        dukeName: formatDukeName(row.duke_slug, {
          emptyLabel: 'No Duke Selected',
        }),
        stats,
      }
    })
    .sort((left, right) => {
      if ((left.placement ?? 9999) !== (right.placement ?? 9999)) {
        return (left.placement ?? 9999) - (right.placement ?? 9999)
      }

      if (left.totalScore !== right.totalScore) {
        return right.totalScore - left.totalScore
      }

      return left.label.localeCompare(right.label)
    })
}
