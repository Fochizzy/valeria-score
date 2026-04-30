import { supabase } from './supabase'
import {
  deleteGuestProfile as deleteGuestProfileFlow,
  deleteMyAccountAndData as deleteMyAccountAndDataFlow,
  deleteMyProfile as deleteMyProfileFlow,
  deleteOwnedGame as deleteOwnedGameFlow,
  leaveAllGames as leaveAllGamesFlow,
  leaveOwnedOrJoinedGame as leaveOwnedOrJoinedGameFlow,
} from './manage-delete-flow'

export async function deleteMyProfile() {
  await deleteMyProfileFlow({
    invokeRpc: async (fn, args) => supabase.rpc(fn, args),
  })
}

export async function deleteMyAccountAndData() {
  await deleteMyAccountAndDataFlow({
    invokeDeleteAccount: () =>
      supabase.functions.invoke('delete-account', {
        body: {},
      }),
    signOutLocal: () => supabase.auth.signOut({ scope: 'local' }),
  })
}

export async function deleteGuestProfile(guestId: string) {
  await deleteGuestProfileFlow(guestId, {
    getCurrentUserId: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        throw error
      }

      return user?.id ?? null
    },
    deleteSessionScores: async ({ guestId: safeGuestId, ownerUserId }) =>
      supabase
        .from('session_scores')
        .delete()
        .eq('guest_profile_id', safeGuestId)
        .eq('owner_user_id', ownerUserId),
    deleteGuestProfileRow: async ({ guestId: safeGuestId, ownerUserId }) =>
      supabase
        .from('guest_profiles')
        .delete()
        .eq('id', safeGuestId)
        .eq('owner_user_id', ownerUserId),
  })
}

export async function deleteOwnedGame(sessionId: string) {
  await deleteOwnedGameFlow(sessionId, {
    invokeRpc: async (fn, args) => supabase.rpc(fn, args),
  })
}

export async function leaveOwnedOrJoinedGame(sessionId: string) {
  await leaveOwnedOrJoinedGameFlow(sessionId, {
    invokeRpc: async (fn, args) => supabase.rpc(fn, args),
  })
}

export async function leaveAllGames() {
  await leaveAllGamesFlow({
    invokeRpc: async (fn, args) => supabase.rpc(fn, args),
  })
}
