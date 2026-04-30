# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Forgot password?" action to the login screen that sends a Supabase password reset email for the entered address.

**Architecture:** Extract the reset-email behavior into a small helper in `lib/` so it can be covered with the repo's existing `node:test` pattern, then keep `app/login.tsx` focused on UI wiring and alerts. Reuse the login screen's current email normalization, loading guard, and feedback conventions.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase Auth, Node built-in test runner

---

### Task 1: Add a testable forgot-password flow helper

**Files:**
- Create: `lib/forgot-password-flow.ts`
- Create: `lib/forgot-password-flow.test.js`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ForgotPasswordValidationError,
  requestPasswordReset,
} from './forgot-password-flow.ts'

test('requestPasswordReset rejects blank email input before calling Supabase', async () => {
  let called = false

  await assert.rejects(
    () =>
      requestPasswordReset(
        {
          email: '   ',
        },
        {
          resetPasswordForEmail: async () => {
            called = true
            return { error: null }
          },
        }
      ),
    ForgotPasswordValidationError
  )

  assert.equal(called, false)
})

test('requestPasswordReset normalizes the email and returns a generic success message', async () => {
  const emails = []

  const result = await requestPasswordReset(
    {
      email: '  Player@Example.com ',
    },
    {
      resetPasswordForEmail: async (email) => {
        emails.push(email)
        return { error: null }
      },
    }
  )

  assert.deepEqual(emails, ['player@example.com'])
  assert.equal(
    result.message,
    'If an account exists for that email, check your inbox for reset instructions.'
  )
})

test('requestPasswordReset surfaces Supabase errors', async () => {
  await assert.rejects(
    () =>
      requestPasswordReset(
        {
          email: 'player@example.com',
        },
        {
          resetPasswordForEmail: async () => ({
            error: { message: 'Email rate limit exceeded' },
          }),
        }
      ),
    /Email rate limit exceeded/
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/forgot-password-flow.test.js`
Expected: FAIL with module-not-found or export errors because `lib/forgot-password-flow.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
type AuthErrorLike = {
  message?: string | null
}

type ResetPasswordResult = {
  error?: AuthErrorLike | null
}

type ForgotPasswordDeps = {
  resetPasswordForEmail: (email: string) => Promise<ResetPasswordResult>
}

export class ForgotPasswordValidationError extends Error {}

export async function requestPasswordReset(
  { email }: { email: string },
  deps: ForgotPasswordDeps
) {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new ForgotPasswordValidationError('Enter your email first.')
  }

  const result = await deps.resetPasswordForEmail(normalizedEmail)

  if (result.error) {
    throw new Error(result.error.message ?? 'Unknown error')
  }

  return {
    message:
      'If an account exists for that email, check your inbox for reset instructions.',
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/forgot-password-flow.test.js`
Expected: PASS with 3 tests passing.

### Task 2: Wire the helper into the login screen

**Files:**
- Modify: `app/login.tsx`

- [ ] **Step 1: Import the helper and add the forgot-password handler**

```ts
import {
  ForgotPasswordValidationError,
  requestPasswordReset,
} from '../lib/forgot-password-flow'
```

```ts
  async function handleForgotPassword() {
    try {
      setLoading(true)

      const result = await requestPasswordReset(
        {
          email,
        },
        {
          resetPasswordForEmail: (nextEmail) =>
            supabase.auth.resetPasswordForEmail(nextEmail),
        }
      )

      Alert.alert('Check your email', result.message)
    } catch (err: any) {
      if (err instanceof ForgotPasswordValidationError) {
        Alert.alert('Missing info', err.message)
        return
      }

      Alert.alert('Reset failed', err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
```

- [ ] **Step 2: Add the new button near the password field**

```tsx
            <Pressable
              style={({ pressed }) => [
                styles.linkButton,
                pressed && styles.pressed,
              ]}
              onPress={handleForgotPassword}
              disabled={loading || hydrating}
            >
              <Text style={styles.linkButtonText}>Forgot password?</Text>
            </Pressable>
```

- [ ] **Step 3: Add minimal styles for the link treatment**

```ts
  linkButton: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 14,
  },
  linkButtonText: {
    color: '#BCAEE0',
    fontSize: 13,
    fontWeight: '800',
  },
```

- [ ] **Step 4: Run verification commands**

Run: `node --test lib/forgot-password-flow.test.js`
Expected: PASS

Run: `npx expo lint -- app/login.tsx lib/forgot-password-flow.ts`
Expected: exit 0 with no lint errors for the touched files. If the command shape is unsupported by Expo lint in this repo, run `npm run lint` and verify there are no new errors caused by these changes.

- [ ] **Step 5: Manual spot-check**

Open the login screen and verify:
- tapping `Forgot password?` with a blank email shows the validation alert
- tapping it with an email shows the generic confirmation alert
- the action is disabled while auth work is loading

Note: Do not create a git commit in this workspace unless the human partner explicitly asks for one, because the working tree already contains unrelated changes.
