export type LogoutDependencies = {
  signOut: () => Promise<{ error: Error | null }>
  clearActiveSessionState: () => Promise<void>
}

export async function logoutAndClearActiveSessionState({
  signOut,
  clearActiveSessionState,
}: LogoutDependencies) {
  const { error } = await signOut()

  if (error) {
    throw error
  }

  await clearActiveSessionState()
}
