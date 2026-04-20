import AsyncStorage from '@react-native-async-storage/async-storage'

const ACTIVE_SESSION_ID_KEY = 'active_session_id'
const ACTIVE_JOIN_CODE_KEY = 'active_join_code'

export async function setActiveSessionId(sessionId: string) {
  await AsyncStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId)
}

export async function getActiveSessionId() {
  return AsyncStorage.getItem(ACTIVE_SESSION_ID_KEY)
}

export async function clearActiveSessionId() {
  await AsyncStorage.removeItem(ACTIVE_SESSION_ID_KEY)
}

export async function setActiveJoinCode(joinCode: string) {
  await AsyncStorage.setItem(ACTIVE_JOIN_CODE_KEY, joinCode)
}

export async function getActiveJoinCode() {
  return AsyncStorage.getItem(ACTIVE_JOIN_CODE_KEY)
}

export async function clearActiveJoinCode() {
  await AsyncStorage.removeItem(ACTIVE_JOIN_CODE_KEY)
}

export async function clearActiveSessionState() {
  await Promise.all([
    AsyncStorage.removeItem(ACTIVE_SESSION_ID_KEY),
    AsyncStorage.removeItem(ACTIVE_JOIN_CODE_KEY),
  ])
}