export const theme = {
  colors: {
    background: '#0A0F1E',
    backgroundAlt: '#12182B',

    surface: 'rgba(25, 18, 43, 0.88)',
    surfaceRaised: 'rgba(38, 27, 63, 0.96)',
    surfaceAlt: 'rgba(31, 22, 52, 0.92)',

    border: 'rgba(170, 145, 255, 0.16)',
    borderSoft: 'rgba(170, 145, 255, 0.26)',
    borderAccent: '#8E72FF',

    primary: '#7B5CFF',
    primaryLight: '#B7A5FF',
    primaryDark: '#5A3FD4',

    accent: '#E4DAFF',
    success: '#70D7A5',
    error: '#FF7E8A',

    text: '#F8F7FF',
    textSecondary: '#CFC7E8',
    textMuted: '#958CB7',

    gold: '#F4C85C',
    magic: '#64A8FF',
    fight: '#FF7A7A',
    holy: '#F3E7A1',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    xxl: 28,
    pill: 999,
  },

  typography: {
    title: {
      fontSize: 30,
      fontWeight: '900' as const,
      color: '#F8F7FF',
    },
    body: {
      fontSize: 14,
      color: '#CFC7E8',
    },
    button: {
      fontSize: 16,
      fontWeight: '900' as const,
      color: '#FFFFFF',
    },
  },

  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    glow: {
      shadowColor: '#8B5CF6',
      shadowOpacity: 0.32,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
  },
}

export const statColors: Record<string, string> = {
  gold: theme.colors.gold,
  magic: theme.colors.magic,
  fight: theme.colors.fight,
  holy: theme.colors.holy,
  hammer: '#F2AE72',
  helmet: '#8AD3FF',
  key: '#C7A6FF',
  vp: '#FFB4E1',
  citizenCount: '#7BD88F',
  monstersCount: '#FF8C8C',
  domainCount: '#6CD4C5',
  monsterPoints: '#FFA26E',
  domainPoints: '#72C4FF',
  bossCount: '#FF6B6B',
  lieutenantCount: '#C084FC',
  beastCount: '#F59E0B',
  minionCount: '#94A3B8',
}