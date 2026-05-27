type ScoreSectionHeaderMetaOptions = {
  isLocked: boolean
}

export function getScoreSectionHeaderMeta({
  isLocked,
}: ScoreSectionHeaderMetaOptions) {
  return {
    hintText: isLocked ? null : 'Hold for +/- 10',
    showCountBadge: false,
  }
}
