import { supabase } from './supabase'

export type PlayerGlobalStat = {
  player_key: string
  player_name: string
  public_player_id: string | null
  games_played: number
  wins: number
  second_places: number
  third_places: number
  avg_score: number
  avg_finish: number
}

export type PlayerDukeStat = {
  player_key: string
  player_name: string
  public_player_id: string | null
  duke_slug: string
  games_played: number
  wins: number
  avg_score: number
  avg_finish: number
}

export async function getPlayerGlobalStats(): Promise<PlayerGlobalStat[]> {
  const { data, error } = await supabase
    .from('player_global_stats')
    .select('*')
    .order('wins', { ascending: false })
    .order('avg_score', { ascending: false })

  if (error) throw error
  return (data ?? []) as PlayerGlobalStat[]
}

export async function getPlayerGlobalStatsByPublicPlayerId(
  publicPlayerId: string
): Promise<PlayerGlobalStat[]> {
  const value = publicPlayerId.trim().toUpperCase()

  const { data, error } = await supabase
    .from('player_global_stats')
    .select('*')
    .eq('public_player_id', value)

  if (error) throw error
  return (data ?? []) as PlayerGlobalStat[]
}

export async function getPlayerDukeStats(
  playerKey: string
): Promise<PlayerDukeStat[]> {
  const { data, error } = await supabase
    .from('player_duke_stats')
    .select('*')
    .eq('player_key', playerKey)
    .order('wins', { ascending: false })
    .order('avg_score', { ascending: false })

  if (error) throw error
  return (data ?? []) as PlayerDukeStat[]
}