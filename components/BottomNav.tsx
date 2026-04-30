import React, { useCallback, useMemo, useState } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native'
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../constants/theme'
import { buildBottomNavRoute } from '../lib/bottom-nav-route'
import {
  buildBoundManageAccountMenuActions,
  manageAccountAlertCopy,
} from '../lib/manage-account-menu'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import { clearActiveSessionState } from '../lib/sessions'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'
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

  void insets

  const [accountMenuVisible, setAccountMenuVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const activeKey: NavKey | null = useMemo(() => {
    if (pathname.startsWith('/compare')) return 'compare'
    if (pathname.startsWith('/profile')) return 'profile'
    if (pathname.startsWith('/score')) return 'score'
    return null
  }, [pathname])

  const handleHomePress = useCallback(() => {
    router.replace('/create-session')
  }, [router])

  const handleNavPress = useCallback(
    (item: NavItem) => {
      if (item.key === 'manage') {
        setAccountMenuVisible(true)
        return
      }

      if (!item.path) return

      const navParams = {
        selectedSlug: typeof params.selectedSlug === 'string' ? params.selectedSlug : '',
        sessionId: typeof params.sessionId === 'string' ? params.sessionId : '',
        joinCode: typeof params.joinCode === 'string' ? params.joinCode : '',
        guestMode: typeof params.guestMode === 'string' ? params.guestMode : '',
        guestName: typeof params.guestName === 'string' ? params.guestName : '',
        guestEntryId:
          typeof params.guestEntryId === 'string' ? params.guestEntryId : '',
        guestProfileId:
          typeof params.guestProfileId === 'string' ? params.guestProfileId : '',
      }

      router.push(buildBottomNavRoute(item.path, navParams))
    },
    [params, router]
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
        onManageData: () => router.push('/manage-data'),
        onNewSession: () => router.replace('/create-session'),
        onDukeStatistics: () => router.push('/duke-stats'),
        onPlayerStatistics: () => router.push('/player-stats'),
        onGlobalTrends: () => router.push('/global-trends'),
        onLogout: () => {
          void handleLogout()
        },
      }),
    [router, handleLogout]
  )

  return (
    <>
      <View style={styles.wrap}>
        <View style={styles.bar}>
          <Pressable
            onPress={handleHomePress}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityLabel="Home"
          >
            <Image source={homeIcon} style={styles.homeIcon} resizeMode="contain" />
          </Pressable>

          <View style={styles.tabsRow}>
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

const ICON_SIZE = 54
const CHIP_HEIGHT = 70

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    zIndex: 20,
    elevation: 20,
  },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1330',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 7,
    paddingVertical: 7,
    gap: 7,
    ...theme.shadow.card,
  },

  backButton: {
    width: 62,
    minHeight: CHIP_HEIGHT,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#251A40',
    paddingVertical: 6,
  },

  homeIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    opacity: 0.86,
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
})
