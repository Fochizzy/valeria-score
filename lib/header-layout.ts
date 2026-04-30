type HeaderLayoutVariant = 'default' | 'tall'

type GetHeaderLayoutMetricsInput = {
  compact?: boolean
  safeAreaTop: number
  rightButtonVariant?: HeaderLayoutVariant
}

function normalizeSafeAreaTop(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

export function getHeaderLayoutMetrics({
  compact = false,
  safeAreaTop,
  rightButtonVariant = 'default',
}: GetHeaderLayoutMetricsInput) {
  if (!compact) {
    return {
      wrapPaddingTop: 0,
      topRowMinHeight: 52,
    }
  }

  const safeAreaPaddingTop = normalizeSafeAreaTop(safeAreaTop)
  const baseWrapPaddingTop = rightButtonVariant === 'tall' ? 12 : 6

  return {
    wrapPaddingTop: baseWrapPaddingTop + safeAreaPaddingTop,
    topRowMinHeight: rightButtonVariant === 'tall' ? 84 : 44,
  }
}
