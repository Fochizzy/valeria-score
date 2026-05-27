import type { StatKey } from '../data/cards.ts'
import { createEmptyInputs, normalizeScoreInputs, type ScoreInputs } from './scoring.ts'

export const SOLO_DRAFT_STORAGE_KEY = 'solo-score-draft/v1'

export const SOLO_VICTORY_CONDITION_OPTIONS = [
  {
    id: 'slay_all_monsters',
    title: 'You Slay all Monsters',
    description:
      'Player victory. No scoring required once the solo game ends and is saved.',
  },
  {
    id: 'monster_attacks_empty_column',
    title: 'Monster Attacks Empty Column',
    description:
      'Dark Lord victory. No scoring required once the solo game ends and is saved.',
  },
  {
    id: 'five_stacks_exhausted',
    title: 'Five Stacks Are Exhausted',
    description: 'Contested finish. Compare the Player and Dark Lord totals to decide the winner.',
  },
] as const

export type SoloVictoryCondition = (typeof SOLO_VICTORY_CONDITION_OPTIONS)[number]['id']
export type SoloWinner = 'player' | 'dark_lord'
export type SoloResolution = 'player_auto' | 'dark_lord_auto' | 'contested'
export type SoloSideRole = 'player' | 'dark_lord'

export type SoloScoreSide = {
  dukeSlug: string | null
  inputs: ScoreInputs
}

export type SoloDraft = {
  victoryCondition: SoloVictoryCondition | null
  player: SoloScoreSide
  darkLord: SoloScoreSide
  savedGameId: string | null
  savedWinner: SoloWinner | null
  savedAt: string | null
}

export type SoloOutcome = {
  winner: SoloWinner
  resolution: SoloResolution
  requiresScoring: boolean
}

const DARK_LORD_HIDDEN_STAT_KEYS: StatKey[] = ['gold', 'magic', 'fight']

function normalizeText(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

export function createEmptySoloSide(): SoloScoreSide {
  return {
    dukeSlug: null,
    inputs: createEmptyInputs(),
  }
}

export function createEmptySoloDraft(): SoloDraft {
  return {
    victoryCondition: null,
    player: createEmptySoloSide(),
    darkLord: createEmptySoloSide(),
    savedGameId: null,
    savedWinner: null,
    savedAt: null,
  }
}

export function isSoloStatVisibleForRole(role: SoloSideRole, key: StatKey) {
  if (role !== 'dark_lord') return true
  return !DARK_LORD_HIDDEN_STAT_KEYS.includes(key)
}

export function sanitizeSoloInputsForRole(
  role: SoloSideRole,
  payload: Partial<Record<StatKey, number>> | null | undefined
): ScoreInputs {
  const normalized = normalizeScoreInputs(payload)

  if (role !== 'dark_lord') {
    return normalized
  }

  return {
    ...normalized,
    gold: 0,
    magic: 0,
    fight: 0,
  }
}

export function isSoloVictoryCondition(value: unknown): value is SoloVictoryCondition {
  return SOLO_VICTORY_CONDITION_OPTIONS.some((option) => option.id === value)
}

export function isSoloSideRole(value: unknown): value is SoloSideRole {
  return value === 'player' || value === 'dark_lord'
}

export function parseSoloVictoryCondition(value: unknown): SoloVictoryCondition | null {
  return isSoloVictoryCondition(value) ? value : null
}

export function parseSoloSideRole(value: unknown): SoloSideRole | null {
  return isSoloSideRole(value) ? value : null
}

export function resolveSoloOutcome({
  victoryCondition,
  playerTotal,
  darkLordTotal,
}: {
  victoryCondition: SoloVictoryCondition
  playerTotal: number
  darkLordTotal: number
}): SoloOutcome {
  if (victoryCondition === 'slay_all_monsters') {
    return {
      winner: 'player',
      resolution: 'player_auto',
      requiresScoring: false,
    }
  }

  if (victoryCondition === 'monster_attacks_empty_column') {
    return {
      winner: 'dark_lord',
      resolution: 'dark_lord_auto',
      requiresScoring: false,
    }
  }

  return {
    winner: playerTotal > darkLordTotal ? 'player' : 'dark_lord',
    resolution: 'contested',
    requiresScoring: true,
  }
}

export function validateSoloGameSetup({
  victoryCondition,
  playerDukeSlug,
  darkLordDukeSlug,
}: {
  victoryCondition: SoloVictoryCondition | null
  playerDukeSlug: string | null | undefined
  darkLordDukeSlug: string | null | undefined
}) {
  const hasVictoryCondition = isSoloVictoryCondition(victoryCondition)
  const hasPlayerDuke = Boolean(normalizeText(playerDukeSlug))
  const hasDarkLordDuke = Boolean(normalizeText(darkLordDukeSlug))

  if (!hasVictoryCondition) {
    return {
      ok: false as const,
      reason: 'Choose a victory condition before ending the solo game.',
    }
  }

  if (victoryCondition !== 'five_stacks_exhausted') {
    return { ok: true as const, reason: '' }
  }

  if (hasPlayerDuke && hasDarkLordDuke) {
    return { ok: true as const, reason: '' }
  }

  return {
    ok: false as const,
    reason: 'Choose both dukes before ending a contested solo game.',
  }
}

export function applySoloDukeSelection(
  draft: SoloDraft,
  role: SoloSideRole,
  dukeSlug: string
): SoloDraft {
  if (role === 'dark_lord') {
    return {
      ...draft,
      darkLord: {
        ...draft.darkLord,
        dukeSlug,
      },
      savedGameId: draft.savedGameId,
      savedWinner: null,
      savedAt: null,
    }
  }

  return {
    ...draft,
    player: {
      ...draft.player,
      dukeSlug,
    },
    savedGameId: draft.savedGameId,
    savedWinner: null,
    savedAt: null,
  }
}

export function buildSoloDraftFromResult(result: {
  id: string | null | undefined
  playerDukeSlug: string | null | undefined
  darkLordDukeSlug: string | null | undefined
  victoryCondition: SoloVictoryCondition
  winner: SoloWinner
  playerInputs: Partial<Record<StatKey, number>> | null | undefined
  darkLordInputs: Partial<Record<StatKey, number>> | null | undefined
  updatedAt?: string | null | undefined
  createdAt?: string | null | undefined
}): SoloDraft {
  return {
    victoryCondition: result.victoryCondition,
    player: {
      dukeSlug: normalizeText(result.playerDukeSlug),
      inputs: sanitizeSoloInputsForRole('player', result.playerInputs),
    },
    darkLord: {
      dukeSlug: normalizeText(result.darkLordDukeSlug),
      inputs: sanitizeSoloInputsForRole('dark_lord', result.darkLordInputs),
    },
    savedGameId: normalizeText(result.id),
    savedWinner: result.winner,
    savedAt: normalizeText(result.updatedAt ?? result.createdAt),
  }
}

export function normalizeSoloDraft(value: unknown): SoloDraft {
  const fallback = createEmptySoloDraft()

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback
  }

  const record = value as Record<string, unknown>

  return {
    victoryCondition: parseSoloVictoryCondition(record.victoryCondition),
    player: {
      dukeSlug: normalizeText(
        (record.player as Record<string, unknown> | undefined)?.dukeSlug as
          | string
          | null
          | undefined
      ),
      inputs: sanitizeSoloInputsForRole(
        'player',
        (record.player as Record<string, unknown> | undefined)?.inputs as
          | Partial<Record<string, number>>
          | null
          | undefined
      ),
    },
    darkLord: {
      dukeSlug: normalizeText(
        (record.darkLord as Record<string, unknown> | undefined)?.dukeSlug as
          | string
          | null
          | undefined
      ),
      inputs: sanitizeSoloInputsForRole(
        'dark_lord',
        (record.darkLord as Record<string, unknown> | undefined)?.inputs as
          | Partial<Record<string, number>>
          | null
          | undefined
      ),
    },
    savedGameId: normalizeText(record.savedGameId as string | null | undefined),
    savedWinner:
      record.savedWinner === 'player' || record.savedWinner === 'dark_lord'
        ? (record.savedWinner as SoloWinner)
        : null,
    savedAt: normalizeText(record.savedAt as string | null | undefined),
  }
}

export function buildSoloWinnerBanner(winner: SoloWinner) {
  return winner === 'player' ? 'Winner: Player' : 'Winner: Dark Lord'
}

export function getSoloVictoryConditionCopy(condition: SoloVictoryCondition | null) {
  if (!condition) return null
  return SOLO_VICTORY_CONDITION_OPTIONS.find((option) => option.id === condition) ?? null
}
