type DukeSearchOption = {
  slug: string
  name: string
}

export function filterDukesByQuery<T extends DukeSearchOption>(dukes: T[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return dukes
  }

  return dukes.filter((duke) => duke.name.toLowerCase().includes(normalizedQuery))
}
