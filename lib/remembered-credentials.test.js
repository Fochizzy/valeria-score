import assert from 'node:assert/strict'
import test from 'node:test'

import {
  loadRememberedCredentials,
  persistRememberedCredentials,
} from './remembered-credentials.ts'

function createStore(initialEntries = {}) {
  const state = new Map(Object.entries(initialEntries))

  return {
    async getItem(key) {
      return state.has(key) ? state.get(key) : null
    },
    async setItem(key, value) {
      state.set(key, value)
    },
    async removeItem(key) {
      state.delete(key)
    },
    snapshot() {
      return Object.fromEntries(state.entries())
    },
  }
}

test('loadRememberedCredentials migrates legacy stored credentials into secure storage', async () => {
  const secureStore = createStore()
  const legacyStore = createStore({
    remember_me_enabled: 'true',
    remembered_email: 'player@example.com',
    remembered_password: 'hunter2',
  })

  const result = await loadRememberedCredentials({
    secureStore,
    legacyStore,
  })

  assert.deepEqual(result, {
    rememberMe: true,
    email: 'player@example.com',
    password: 'hunter2',
  })

  assert.deepEqual(secureStore.snapshot(), {
    remember_me_enabled: 'true',
    remembered_email: 'player@example.com',
    remembered_password: 'hunter2',
  })

  assert.deepEqual(legacyStore.snapshot(), {})
})

test('persistRememberedCredentials stores values in secure storage and clears legacy storage', async () => {
  const secureStore = createStore()
  const legacyStore = createStore({
    remember_me_enabled: 'true',
    remembered_email: 'legacy@example.com',
    remembered_password: 'legacy-password',
  })

  await persistRememberedCredentials({
    secureStore,
    legacyStore,
    rememberMe: true,
    email: 'player@example.com',
    password: 'hunter2',
  })

  assert.deepEqual(secureStore.snapshot(), {
    remember_me_enabled: 'true',
    remembered_email: 'player@example.com',
    remembered_password: 'hunter2',
  })

  assert.deepEqual(legacyStore.snapshot(), {})
})

test('persistRememberedCredentials clears secure and legacy storage when remember me is disabled', async () => {
  const secureStore = createStore({
    remember_me_enabled: 'true',
    remembered_email: 'player@example.com',
    remembered_password: 'hunter2',
  })
  const legacyStore = createStore({
    remember_me_enabled: 'true',
    remembered_email: 'legacy@example.com',
    remembered_password: 'legacy-password',
  })

  await persistRememberedCredentials({
    secureStore,
    legacyStore,
    rememberMe: false,
    email: '',
    password: '',
  })

  assert.deepEqual(secureStore.snapshot(), {})
  assert.deepEqual(legacyStore.snapshot(), {})
})
