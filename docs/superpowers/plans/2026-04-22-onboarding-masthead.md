# Onboarding Masthead Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `login`, `create-user`, and `choose-player-id` one shared illustrated onboarding masthead so the app feels visually cohesive from first launch onward, without adding any progress-step label such as "Step 2 of 2" or "Finish Setup".

**Architecture:** Introduce a single reusable `OnboardingMasthead` component backed by a small pure config helper so the shared structure is consistent while each screen keeps its own copy and form behavior. Each screen will switch from a standalone hero card to a masthead-plus-overlapping-form layout, reusing `assets/Citizen Backdrop.png` with a dark scrim and existing Valeria branding.

**Tech Stack:** Expo Router, React Native, TypeScript, Expo image assets, Node `node:test`, ESLint, TypeScript compiler

---

## File Map

- Create: `components/OnboardingMasthead.tsx`
- Create: `lib/onboarding-masthead.ts`
- Create: `lib/onboarding-masthead.test.js`
- Modify: `app/login.tsx`
- Modify: `app/create-user.tsx`
- Modify: `app/choose-player-id.tsx`

## Implementation Notes

- Reuse `assets/Citizen Backdrop.png` as the onboarding artwork for all three screens.
- Do not add onboarding progress labels or badges.
- Keep existing form fields, button labels, auth logic, and navigation flows unchanged.
- Preserve `KeyboardAvoidingView` behavior and safe-area handling.
- Use the existing `theme` object instead of leaving `login.tsx` and `create-user.tsx` on hardcoded colors where practical during the touch-up.

### Task 1: Add a Testable Masthead Config Helper

**Files:**
- Create: `lib/onboarding-masthead.ts`
- Test: `lib/onboarding-masthead.test.js`

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getOnboardingMastheadContent,
} = require('./onboarding-masthead')

test('returns login masthead copy without a progress label', () => {
  assert.deepEqual(getOnboardingMastheadContent('login'), {
    kicker: 'Valeria Score',
    title: 'Login',
    subtitle: 'Sign in to continue to your sessions and scores.',
  })
})

test('returns create-user masthead copy without a progress label', () => {
  assert.deepEqual(getOnboardingMastheadContent('create-user'), {
    kicker: 'Valeria Score',
    title: 'Create User',
    subtitle: 'Create your account, then choose your public player ID.',
  })
})

test('returns choose-player-id masthead copy without a progress label', () => {
  assert.deepEqual(getOnboardingMastheadContent('choose-player-id'), {
    kicker: 'Public Identity',
    title: 'Choose Player ID',
    subtitle: 'Other players will use this public ID to recognize you in shared games.',
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/onboarding-masthead.test.js`
Expected: FAIL with `Cannot find module './onboarding-masthead'` or missing export failure.

- [ ] **Step 3: Write minimal implementation**

```ts
type OnboardingScreenKey = 'login' | 'create-user' | 'choose-player-id'

type OnboardingMastheadContent = {
  kicker: string
  title: string
  subtitle: string
}

const CONTENT: Record<OnboardingScreenKey, OnboardingMastheadContent> = {
  login: {
    kicker: 'Valeria Score',
    title: 'Login',
    subtitle: 'Sign in to continue to your sessions and scores.',
  },
  'create-user': {
    kicker: 'Valeria Score',
    title: 'Create User',
    subtitle: 'Create your account, then choose your public player ID.',
  },
  'choose-player-id': {
    kicker: 'Public Identity',
    title: 'Choose Player ID',
    subtitle: 'Other players will use this public ID to recognize you in shared games.',
  },
}

export function getOnboardingMastheadContent(screen: OnboardingScreenKey) {
  return CONTENT[screen]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/onboarding-masthead.test.js`
Expected: PASS with `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/onboarding-masthead.ts lib/onboarding-masthead.test.js
git commit -m "test: add onboarding masthead content helper"
```

### Task 2: Build the Shared Onboarding Masthead Component

**Files:**
- Create: `components/OnboardingMasthead.tsx`
- Modify: `app/login.tsx`
- Modify: `app/create-user.tsx`
- Modify: `app/choose-player-id.tsx`

- [ ] **Step 1: Add the reusable component**

```tsx
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native'
import { theme } from '../constants/theme'

const logo = require('../assets/valeria_logo.png')
const backdrop = require('../assets/Citizen Backdrop.png')

type Props = {
  kicker: string
  title: string
  subtitle: string
}

export default function OnboardingMasthead({ kicker, title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <ImageBackground
        source={backdrop}
        style={styles.hero}
        imageStyle={styles.heroImage}
        resizeMode="cover"
      >
        <View style={styles.scrim}>
          <View style={styles.logoFrame}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </ImageBackground>
    </View>
  )
}
```

- [ ] **Step 2: Add shared masthead styles with overlap-friendly spacing**

```tsx
const styles = StyleSheet.create({
  wrap: {
    marginBottom: -18,
    zIndex: 1,
  },
  hero: {
    minHeight: 260,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
  },
  heroImage: {
    opacity: 1,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.64)',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
    justifyContent: 'flex-end',
  },
  logoFrame: {
    width: 170,
    height: 96,
    borderRadius: 18,
    backgroundColor: 'rgba(25, 18, 43, 0.72)',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 142,
    height: 74,
  },
  kicker: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
})
```

- [ ] **Step 3: Run static verification for the new component**

Run: `node node_modules\\typescript\\bin\\tsc --noEmit`
Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/OnboardingMasthead.tsx
git commit -m "feat: add shared onboarding masthead component"
```

### Task 3: Refactor Login and Create User to Use the Shared Layout

**Files:**
- Modify: `app/login.tsx`
- Modify: `app/create-user.tsx`

- [ ] **Step 1: Replace the duplicated hero card in `app/login.tsx`**

```tsx
import OnboardingMasthead from '../components/OnboardingMasthead'
import { getOnboardingMastheadContent } from '../lib/onboarding-masthead'
import { theme } from '../constants/theme'

const masthead = getOnboardingMastheadContent('login')

<View style={styles.content}>
  <OnboardingMasthead {...masthead} />

  <View style={styles.formCard}>
    {/* existing login form unchanged */}
  </View>
</View>
```

- [ ] **Step 2: Replace the duplicated hero card in `app/create-user.tsx`**

```tsx
import OnboardingMasthead from '../components/OnboardingMasthead'
import { getOnboardingMastheadContent } from '../lib/onboarding-masthead'
import { theme } from '../constants/theme'

const masthead = getOnboardingMastheadContent('create-user')

<View style={styles.content}>
  <OnboardingMasthead {...masthead} />

  <View style={styles.formCard}>
    {/* existing create-user form unchanged */}
  </View>
</View>
```

- [ ] **Step 3: Update both screens’ container and form styles for the overlapping-card composition**

```tsx
content: {
  flex: 1,
  justifyContent: 'center',
  padding: 16,
},
formCard: {
  backgroundColor: theme.colors.surfaceAlt,
  borderRadius: theme.radius.xxl,
  borderWidth: 1,
  borderColor: theme.colors.border,
  padding: 16,
  paddingTop: 28,
  ...theme.shadow.card,
},
```

- [ ] **Step 4: Run lint on the touched auth screens**

Run: `node node_modules\\eslint\\bin\\eslint.js app/login.tsx app/create-user.tsx components/OnboardingMasthead.tsx lib/onboarding-masthead.ts`
Expected: PASS with no lint errors.

- [ ] **Step 5: Commit**

```bash
git add app/login.tsx app/create-user.tsx components/OnboardingMasthead.tsx lib/onboarding-masthead.ts
git commit -m "feat: unify login and create-user mastheads"
```

### Task 4: Refactor Choose Player ID Into the Same Onboarding Family

**Files:**
- Modify: `app/choose-player-id.tsx`

- [ ] **Step 1: Swap the local hero block for the shared masthead**

```tsx
import OnboardingMasthead from '../components/OnboardingMasthead'
import { getOnboardingMastheadContent } from '../lib/onboarding-masthead'

const masthead = getOnboardingMastheadContent('choose-player-id')

<View style={styles.content}>
  <OnboardingMasthead {...masthead} />

  <View style={styles.formCard}>
    {/* existing player ID input, help text, preview, and continue button */}
  </View>
</View>
```

- [ ] **Step 2: Preserve the current preview card and setup logic while aligning spacing with the new layout**

```tsx
formCard: {
  backgroundColor: theme.colors.surfaceAlt,
  borderRadius: theme.radius.xxl,
  borderWidth: 1,
  borderColor: theme.colors.border,
  padding: 16,
  paddingTop: 28,
  ...theme.shadow.card,
},
previewCard: {
  backgroundColor: theme.colors.surfaceRaised,
  borderRadius: theme.radius.lg,
  borderWidth: 1,
  borderColor: theme.colors.borderSoft,
  padding: 14,
  alignItems: 'center',
  marginBottom: 14,
},
```

- [ ] **Step 3: Run lint and TypeScript checks on the full onboarding set**

Run: `node node_modules\\eslint\\bin\\eslint.js app/choose-player-id.tsx app/login.tsx app/create-user.tsx components/OnboardingMasthead.tsx lib/onboarding-masthead.ts && node node_modules\\typescript\\bin\\tsc --noEmit`
Expected: PASS with no lint or TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/choose-player-id.tsx
git commit -m "feat: align choose-player-id with onboarding masthead"
```

### Task 5: Manual Visual Verification

**Files:**
- Verify: `app/login.tsx`
- Verify: `app/create-user.tsx`
- Verify: `app/choose-player-id.tsx`

- [ ] **Step 1: Launch the Expo app**

Run: `npm.cmd run start`
Expected: Expo dev server starts without runtime errors.

- [ ] **Step 2: Check the login screen**

Verify:
- the masthead uses illustrated artwork plus a dark scrim
- the logo frame, kicker, title, and subtitle remain readable
- the form card overlaps the masthead cleanly
- the remembered-credentials and forgot-password controls still fit on smaller screens

- [ ] **Step 3: Check the create-user screen**

Verify:
- the screen matches the same masthead structure as login
- the form still scrolls or fits correctly when the keyboard opens
- button spacing and touch targets remain unchanged

- [ ] **Step 4: Check the choose-player-id screen**

Verify:
- it now feels part of the same onboarding family without any progress-step label
- the preview card still stands out and remains readable
- the screen still works on shorter devices without clipping the continue button

- [ ] **Step 5: Commit the finished feature**

```bash
git add app/login.tsx app/create-user.tsx app/choose-player-id.tsx components/OnboardingMasthead.tsx lib/onboarding-masthead.ts lib/onboarding-masthead.test.js
git commit -m "feat: refresh onboarding mastheads"
```

## Self-Review

- Spec coverage: the plan covers the shared masthead component, screen adoption on all three onboarding screens, reuse of existing art, and explicit omission of progress-step labels.
- Placeholder scan: no `TODO` or undefined implementation steps remain.
- Type consistency: `getOnboardingMastheadContent` and `OnboardingMasthead` are referenced consistently across all tasks.
