export type OnboardingMastheadScreen =
  | 'login'
  | 'create-user'
  | 'choose-player-id'

export type OnboardingMastheadContent = {
  kicker: string
  title: string
  subtitle: string
}

const MASTHEAD_CONTENT: Record<
  OnboardingMastheadScreen,
  OnboardingMastheadContent
> = {
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

export function getOnboardingMastheadContent(
  screen: OnboardingMastheadScreen
) {
  return MASTHEAD_CONTENT[screen]
}
