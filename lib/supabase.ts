import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL')
}

if (!supabaseKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
}

// During static web export, route modules execute in Node where
// window/localStorage don't exist. Give auth an inert storage there so the
// client can be constructed; real devices and browsers are unaffected
// (React Native defines window, so isServer is false on native).
const isServer = typeof window === 'undefined'

const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: isServer ? noopStorage : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
})
