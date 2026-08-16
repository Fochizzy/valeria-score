import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export type ConnectivityListener = (online: boolean) => void

function stateIsOnline(state: { isConnected: boolean | null }): boolean {
  // NetInfo reports null while it is still probing. Treat unknown as online
  // so we never flash a false "offline" banner during startup.
  return state.isConnected !== false
}

/**
 * Subscribe to connectivity transitions. The callback fires with the current
 * value immediately and on every change afterwards. Returns an unsubscribe.
 */
export function subscribeToConnectivity(listener: ConnectivityListener): () => void {
  NetInfo.fetch().then((state) => listener(stateIsOnline(state)))

  return NetInfo.addEventListener((state) => {
    listener(stateIsOnline(state))
  })
}

/**
 * True while the device believes it has a usable connection.
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => subscribeToConnectivity(setOnline), [])

  return online
}
