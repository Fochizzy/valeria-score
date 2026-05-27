type AuthErrorLike = {
  message?: string | null
}

type SignUpResult = {
  data?: {
    user?: {
      email?: string | null
      phone?: string | null
      identities?: unknown[] | null
      is_anonymous?: boolean
    } | null
    session?: unknown
  } | null
  error?: AuthErrorLike | null
}

type SignInResult = {
  error?: AuthErrorLike | null
}

type ProfileLike = {
  public_player_id?: string | null
} | null

type CreateUserFlowDeps = {
  signUp: (input: {
    email: string
    password: string
    options: {
      emailRedirectTo?: string
      data: Record<string, unknown> & {
        display_name: string
      }
    }
  }) => Promise<SignUpResult>
  signInWithPassword: (input: {
    email: string
    password: string
  }) => Promise<SignInResult>
  // We always sign the user out after a fresh signUp so the email-confirmation
  // step is mandatory regardless of how the supabase project is configured.
  signOut: () => Promise<{ error?: AuthErrorLike | null } | void>
  ensureProfileRow: () => Promise<void>
  getMyProfile: () => Promise<ProfileLike>
}

export type CreateUserFlowResult = {
  recoveredExistingAccount: boolean
  nextRoute: '/choose-player-id' | '/create-session' | '/login'
}

export function isExistingUserSignUpError(message: string | null | undefined) {
  const normalized = message?.trim().toLowerCase() ?? ''

  return (
    normalized.includes('user already registered') ||
    normalized.includes('user already exists') ||
    normalized.includes('already exists') ||
    normalized.includes('already registered')
  )
}

function buildExistingAccountError() {
  return new Error(
    'That email already has an account. Log in with your existing password to recreate your profile, or reset your password if needed.'
  )
}

function resolveNextRoute(profile: ProfileLike) {
  return profile?.public_player_id ? '/create-session' : '/choose-player-id'
}

function isObfuscatedExistingUserSignUpResult(signUpResult: SignUpResult) {
  const user = signUpResult.data?.user
  if (!user || user.is_anonymous) return false

  const hasIdentityBackedLogin = Boolean(user.email || user.phone)
  const identities = user.identities

  // Inference from Supabase Auth docs/source: email and phone signups should
  // return a permanent identity-backed user, while duplicate-protected signup
  // calls can come back as an obfuscated "fake user". We treat an email/phone
  // user with an explicit empty identities array as that existing-account case.
  return hasIdentityBackedLogin && Array.isArray(identities) && identities.length === 0
}

export async function createUserOrRecoverExistingAccount(
  {
    email,
    password,
    displayName,
    extraSignUpMetadata,
    emailRedirectTo,
  }: {
    email: string
    password: string
    displayName: string
    // Extra fields to merge into the new auth user's user_metadata. Used to
    // smuggle a pending guest claim through the email-confirmation gate so it
    // can be redeemed on the user's first successful login.
    extraSignUpMetadata?: Record<string, unknown> | null
    // Where Supabase should redirect after the user confirms their email.
    // Should be the app's deep link scheme (e.g. 'valeriascore://').
    emailRedirectTo?: string
  },
  deps: CreateUserFlowDeps
): Promise<CreateUserFlowResult> {
  const signUpResult = await deps.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
      data: {
        display_name: displayName,
        ...(extraSignUpMetadata ?? {}),
      },
    },
  })

  const shouldRecoverExistingAccount =
    (signUpResult.error && isExistingUserSignUpError(signUpResult.error.message)) ||
    isObfuscatedExistingUserSignUpResult(signUpResult)

  if (signUpResult.error && !shouldRecoverExistingAccount) {
    throw new Error(signUpResult.error.message ?? 'Unknown error')
  }

  if (shouldRecoverExistingAccount) {
    const signInResult = await deps.signInWithPassword({
      email,
      password,
    })

    if (signInResult.error) {
      throw buildExistingAccountError()
    }

    await deps.ensureProfileRow()
    const profile = await deps.getMyProfile()

    return {
      recoveredExistingAccount: true,
      nextRoute: resolveNextRoute(profile),
    }
  }

  // Fresh sign-up: always force email confirmation. Some supabase setups
  // return an active session immediately after signUp() — drop it so the
  // user can't use the app until they've clicked the confirmation link.
  if (signUpResult.data?.session) {
    try {
      await deps.signOut()
    } catch (err) {
      // Non-fatal: the session is server-side; even if local sign-out fails
      // we still want to send the user to the login screen with the verify
      // message.
      void err
    }
  }

  return {
    recoveredExistingAccount: false,
    nextRoute: '/login',
  }
}
