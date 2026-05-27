import React, { useCallback, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native'
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../constants/theme'
import { getBottomNavBottomOffset } from '../lib/bottom-nav-layout'
import { buildBottomNavRoute } from '../lib/bottom-nav-route'
import {
  buildBoundManageAccountMenuActions,
  manageAccountAlertCopy,
} from '../lib/manage-account-menu'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import { clearActiveSessionState } from '../lib/sessions'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'
import { buildScoreDraftStorageKey } from '../lib/score-screen-state'
import ManageAccountModal from './ManageAccountModal'

const scoreIcon = require('../assets/nav/nav-score.png')
const compareIcon = require('../assets/nav/nav-compare.png')
const profileIcon = require('../assets/nav/nav-profile.png')
const manageIcon = require('../assets/nav/manage_profile.png')
const homeIcon = require('../assets/nav/nav-home.png')

type NavKey = 'score' | 'compare' | 'profile' | 'manage'

type NavItem = {
  key: NavKey
  icon: ImageSourcePropType
  path?: '/score' | '/compare' | '/profile'
}

const ITEMS: NavItem[] = [
  { key: 'score', path: '/score', icon: scoreIcon },
  { key: 'compare', path: '/compare', icon: compareIcon },
  { key: 'profile', path: '/profile', icon: profileIcon },
  { key: 'manage', icon: manageIcon },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const params = useGlobalSearchParams<{
    selectedSlug?: string
    sessionId?: string
    joinCode?: string
    guestMode?: string
    guestName?: string
    guestEntryId?: string
    guestProfileId?: string
  }>()

  const [accountMenuVisible, setAccountMenuVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isScoreRoute = pathname.startsWith('/score')
  const routeSessionId =
    typeof params.sessionId === 'string' ? params.sessionId : ''
  const guestMode = params.guestMode === '1'
  const guestName = typeof params.guestName === 'string' ? params.guestName : ''
  const guestEntryId =
    typeof params.guestEntryId === 'string' ? params.guestEntryId : ''
  const guestProfileId =
    typeof params.guestProfileId === 'string' ? params.guestProfileId : ''

  const wrapStyle = useMemo(
    () => [styles.wrap, { bottom: getBottomNavBottomOffset(insets.bottom) }],
    [insets.bottom]
  )

  const barStyle = useMemo(
    () => [styles.bar, { paddingBottom: 0 }],
    []
  )

  const brandingPad = Math.max(6, insets.bottom / 2)
  const brandingStyle = useMemo(
    () => [
      styles.brandingText,
      {
        paddingTop: brandingPad,
        paddingBottom: brandingPad,
      },
    ],
    [brandingPad]
  )

  const scoreDraftStorageKey = useMemo(
    () =>
      buildScoreDraftStorageKey({
        sessionId: routeSessionId,
        guestMode,
        guestProfileId: guestProfileId || null,
        guestEntryId: guestEntryId || null,
      }),
    [guestEntryId, guestMode, guestProfileId, routeSessionId]
  )

  const activeKey: NavKey | null = useMemo(() => {
    if (pathname.startsWith('/compare')) return 'compare'
    if (pathname.startsWith('/profile')) return 'profile'
    if (pathname.startsWith('/score')) return 'score'
    return null
  }, [pathname])

  const confirmScoreExitIfNeeded = useCallback(
    async (action: () => void) => {
      if (!isScoreRoute) {
        action()
        return
      }

      try {
        const draftValue = scoreDraftStorageKey
          ? await AsyncStorage.getItem(scoreDraftStorageKey)
          : null

        if (!draftValue) {
          action()
          return
        }
      } catch (error) {
        console.error('Failed to read score draft before navigating.', error)
        action()
        return
      }

      Alert.alert(
        'Leave score entry?',
        'You have unsaved score changes on this screen. Leave anyway?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: action,
          },
        ]
      )
    },
    [isScoreRoute, scoreDraftStorageKey]
  )

  const handleHomePress = useCallback(() => {
    void confirmScoreExitIfNeeded(() => {
      router.replace('/create-session')
    })
  }, [confirmScoreExitIfNeeded, router])

  const handleNavPress = useCallback(
    (item: NavItem) => {
      if (item.key === 'manage') {
        setAccountMenuVisible(true)
        return
      }

      if (!item.path || pathname.startsWith(item.path)) return

      const nextPath = item.path

      const navParams = {
        selectedSlug: typeof params.selectedSlug === 'string' ? params.selectedSlug : '',
        sessionId: routeSessionId,
        joinCode: typeof params.joinCode === 'string' ? params.joinCode : '',
        guestMode: guestMode ? '1' : '',
        guestName,
        guestEntryId,
        guestProfileId,
      }

      void confirmScoreExitIfNeeded(() => {
        router.push(buildBottomNavRoute(nextPath, navParams))
      })
    },
    [
      confirmScoreExitIfNeeded,
      guestEntryId,
      guestMode,
      guestName,
      guestProfileId,
      params,
      pathname,
      routeSessionId,
      router,
    ]
  )

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true)
      await logoutAndClearActiveSessionState({
        signOut: () => supabase.auth.signOut(),
        clearActiveSessionState,
      })
      router.replace('/')
    } catch (err: any) {
      Alert.alert('Logout failed', err?.message ?? 'Unknown error')
    } finally {
      setLoggingOut(false)
    }
  }, [router])

  const accountMenuActions = useMemo(
    () =>
      buildBoundManageAccountMenuActions({
        onManageData: () => {
          void confirmScoreExitIfNeeded(() => {
            router.push('/manage-data')
          })
        },
        onNewSession: () => {
          void confirmScoreExitIfNeeded(() => {
            router.replace('/create-session')
          })
        },
        onDukeStatistics: () => {
          void confirmScoreExitIfNeeded(() => {
            router.push('/duke-stats')
          })
        },
        onPlayerStatistics: () => {
          void confirmScoreExitIfNeeded(() => {
            router.push('/player-stats')
          })
        },
        onGlobalTrends: () => {
          void confirmScoreExitIfNeeded(() => {
            router.push('/global-trends')
          })
        },
        onSoloStatistics: () => {
          void confirmScoreExitIfNeeded(() => {
            router.push('/solo-stats' as never)
          })
        },
        onLogout: () => {
          void confirmScoreExitIfNeeded(() => {
            void handleLogout()
          })
        },
      }),
    [confirmScoreExitIfNeeded, router, handleLogout]
  )

  return (
    <>
      <View style={wrapStyle}>
        <View style={barStyle}>
          <View style={styles.tabsRow}>
            <Pressable
              onPress={handleHomePress}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
              hitSlop={8}
              accessibilityLabel="Home"
            >
              <Image source={homeIcon} style={styles.icon} resizeMode="contain" />
            </Pressable>

            {ITEMS.map((item) => {
              const active = item.key !== 'manage' && item.key === activeKey

              return (
                <Pressable
                  key={item.key}
                  onPress={() => handleNavPress(item)}
                  style={({ pressed }) => [
                    styles.tab,
                    active && styles.tabActive,
                    pressed && styles.pressed,
                    item.key === 'manage' && loggingOut && styles.disabled,
                  ]}
                  disabled={item.key === 'manage' && loggingOut}
                  accessibilityLabel={item.key}
                >
                  <Image
                    source={item.icon}
                    style={[styles.icon, active && styles.iconActive]}
                    resizeMode="contain"
                  />
                </Pressable>
              )
            })}
          </View>

          <Text style={brandingStyle}>VALERIA CARD KINGDOMS</Text>
        </View>
      </View>

      <ManageAccountModal
        visible={accountMenuVisible}
        title={manageAccountAlertCopy.title}
        message={manageAccountAlertCopy.message}
        actions={accountMenuActions}
        onRequestClose={() => setAccountMenuVisible(false)}
      />
    </>
  )
}

const ICON_SIZE = 62
const CHIP_HEIGHT = 78

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
  },

  bar: {
    flexDirection: 'column',
    backgroundColor: '#1A1330',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 7,
    paddingTop: 12,
    paddingBottom: 7,
    ...theme.shadow.card,
  },

  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  tab: {
    flex: 1,
    minHeight: CHIP_HEIGHT,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 5,
  },

  tabActive: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    ...theme.shadow.glow,
  },

  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  disabled: {
    opacity: 0.5,
  },

  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    opacity: 0.86,
  },

  iconActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },

  brandingText: {
    color: 'rgba(194, 170, 255, 0.22)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
})
