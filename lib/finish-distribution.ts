export type FinishDistributionBucket = '1st' | '2nd' | '3rd' | '4th+'

export type FinishDistribution = {
  '1st': number
  '2nd': number
  '3rd': number
  '4th+': number
  total: number
}

export type FinishDistributionShare = Record<FinishDistributionBucket, number>

export function computeFinishDistribution(
  finishRanks: Array<number | null | undefined>
): FinishDistribution {
  const result: FinishDistribution = {
    '1st': 0,
    '2nd': 0,
    '3rd': 0,
    '4th+': 0,
    total: 0,
  }

  for (const raw of finishRanks) {
    const rank = Number(raw)
    if (!Number.isFinite(rank) || rank <= 0) continue

    if (rank === 1) result['1st'] += 1
    else if (rank === 2) result['2nd'] += 1
    else if (rank === 3) result['3rd'] += 1
    else result['4th+'] += 1

    result.total += 1
  }

  return result
}

export function computeFinishShares(
  distribution: FinishDistribution
): FinishDistributionShare {
  if (distribution.total <= 0) {
    return { '1st': 0, '2nd': 0, '3rd': 0, '4th+': 0 }
  }
  return {
    '1st': (distribution['1st'] / distribution.total) * 100,
    '2nd': (distribution['2nd'] / distribution.total) * 100,
    '3rd': (distribution['3rd'] / distribution.total) * 100,
    '4th+': (distribution['4th+'] / distribution.total) * 100,
  }
}
