import { cards } from '../data/cards.ts'

function humanizeDukeSlug(slug: string) {
  return slug
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatDukeName(
  slug: string | null | undefined,
  options: { emptyLabel?: string } = {}
) {
  const safeSlug = typeof slug === 'string' ? slug.trim() : ''

  if (!safeSlug) {
    return options.emptyLabel ?? 'No Duke'
  }

  const card = cards.find((item) => item.slug === safeSlug)
  if (card?.name) {
    return card.name
  }

  return humanizeDukeSlug(safeSlug)
}
