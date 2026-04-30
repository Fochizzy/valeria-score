export function didAppBecomeActive(
  previousState: string | null | undefined,
  nextState: string | null | undefined
) {
  const safePreviousState = String(previousState ?? '').trim().toLowerCase()
  const safeNextState = String(nextState ?? '').trim().toLowerCase()

  return Boolean(safePreviousState) && safePreviousState !== 'active' && safeNextState === 'active'
}
