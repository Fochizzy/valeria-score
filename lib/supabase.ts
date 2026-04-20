import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zyoqrknojxoqwqftsrab.supabase.co'
const supabaseAnonKey = 'sb_publishable_5Yu4ltu8hrgTzfG928PMWA_CMTzrGX9'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})