type ScoreSectionHeaderMetaOptions = {
  isLocked: boolean
}

export function getScoreSectionHeaderMeta({
  isLocked,
}: ScoreSectionHeaderMetaOptions) {
  return {
    hintText: isLocked ? null : 'Hold +- for x 10',
    showCountBadge: false,
  }
}
