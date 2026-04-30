export const REMEMBER_ME_KEY = 'remember_me_enabled'
export const REMEMBERED_EMAIL_KEY = 'remembered_email'
export const REMEMBERED_PASSWORD_KEY = 'remembered_password'

export type CredentialStore = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

type LoadRememberedCredentialsArgs = {
  secureStore: CredentialStore
  legacyStore?: CredentialStore | null
}

export type RememberedCredentials = {
  rememberMe: boolean
  email: string
  password: string
}

type PersistRememberedCredentialsArgs = {
  secureStore: CredentialStore
  legacyStore?: CredentialStore | null
  rememberMe: boolean
  email: string
  password: string
}

async function clearLegacyRememberedCredentials(store?: CredentialStore | null) {
  if (!store) return

  await Promise.all([
    store.removeItem(REMEMBER_ME_KEY),
    store.removeItem(REMEMBERED_EMAIL_KEY),
    store.removeItem(REMEMBERED_PASSWORD_KEY),
  ])
}

async function clearSecureRememberedCredentials(store: CredentialStore) {
  await Promise.all([
    store.removeItem(REMEMBER_ME_KEY),
    store.removeItem(REMEMBERED_EMAIL_KEY),
    store.removeItem(REMEMBERED_PASSWORD_KEY),
  ])
}

export async function loadRememberedCredentials({
  secureStore,
  legacyStore,
}: LoadRememberedCredentialsArgs): Promise<RememberedCredentials> {
  const [enabledValue, savedEmail, savedPassword] = await Promise.all([
    secureStore.getItem(REMEMBER_ME_KEY),
    secureStore.getItem(REMEMBERED_EMAIL_KEY),
    secureStore.getItem(REMEMBERED_PASSWORD_KEY),
  ])

  if (enabledValue === 'true') {
    await clearLegacyRememberedCredentials(legacyStore)

    return {
      rememberMe: true,
      email: savedEmail ?? '',
      password: savedPassword ?? '',
    }
  }

  if (!legacyStore) {
    return {
      rememberMe: false,
      email: '',
      password: '',
    }
  }

  const [legacyEnabledValue, legacyEmail, legacyPassword] = await Promise.all([
    legacyStore.getItem(REMEMBER_ME_KEY),
    legacyStore.getItem(REMEMBERED_EMAIL_KEY),
    legacyStore.getItem(REMEMBERED_PASSWORD_KEY),
  ])

  if (legacyEnabledValue !== 'true') {
    await clearLegacyRememberedCredentials(legacyStore)

    return {
      rememberMe: false,
      email: '',
      password: '',
    }
  }

  await Promise.all([
    secureStore.setItem(REMEMBER_ME_KEY, 'true'),
    secureStore.setItem(REMEMBERED_EMAIL_KEY, legacyEmail ?? ''),
    secureStore.setItem(REMEMBERED_PASSWORD_KEY, legacyPassword ?? ''),
  ])
  await clearLegacyRememberedCredentials(legacyStore)

  return {
    rememberMe: true,
    email: legacyEmail ?? '',
    password: legacyPassword ?? '',
  }
}

export async function persistRememberedCredentials({
  secureStore,
  legacyStore,
  rememberMe,
  email,
  password,
}: PersistRememberedCredentialsArgs) {
  if (!rememberMe) {
    await Promise.all([
      clearSecureRememberedCredentials(secureStore),
      clearLegacyRememberedCredentials(legacyStore),
    ])
    return
  }

  await Promise.all([
    secureStore.setItem(REMEMBER_ME_KEY, 'true'),
    secureStore.setItem(REMEMBERED_EMAIL_KEY, email),
    secureStore.setItem(REMEMBERED_PASSWORD_KEY, password),
  ])
  await clearLegacyRememberedCredentials(legacyStore)
}
