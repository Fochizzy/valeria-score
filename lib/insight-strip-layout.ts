type InsightStripLayoutMode = 'default' | 'compact' | boolean

export function getInsightStripRowLayout(mode: InsightStripLayoutMode = 'default') {
  if (mode === true || mode === 'compact') {
    return {
      gap: 8,
      paddingLeft: 10,
      paddingRight: 8,
      wrapMarginTop: 8,
    }
  }

  return {
    gap: 10,
    paddingLeft: 12,
    paddingRight: 12,
    wrapMarginTop: 8,
  }
}
