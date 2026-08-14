import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const dataMode = import.meta.env.VITE_DATA_MODE ?? 'supabase'
const useLocalData = dataMode === 'local'

export const supabaseConfigError =
  useLocalData
    ? ''
    : !supabaseUrl || !supabaseAnonKey
      ? 'Supabase bağlantısı için VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini .env içinde tanımlayın.'
      : ''

export const supabase = supabaseConfigError
  ? null
  : useLocalData
    ? null
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage:
            typeof window === 'undefined' ? undefined : window.sessionStorage,
        },
      })

export function getSupabaseErrorMessage(error) {
  if (!error) {
    return ''
  }

  const message = error.message || ''

  if (message.includes('Invalid login credentials')) {
    return 'Email veya şifre hatalı. Lütfen bilgileri kontrol edin.'
  }

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Bağlantı kurulamadı. İnternet bağlantınızı ve Supabase ayarlarınızı kontrol edin.'
  }

  if (message.includes('JWT') || message.includes('not authorized')) {
    return 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.'
  }

  if (message.includes('duplicate key')) {
    return 'Bu kayıt zaten mevcut.'
  }

  if (message.includes('violates row-level security')) {
    return 'Bu işlem için kurum yetkiniz bulunmuyor.'
  }

  if (message.includes('schema cache') || message.includes('Could not find')) {
    return 'Supabase tabloları henüz kurulmamış. Migration SQL dosyasını Supabase SQL Editor içinde çalıştırın.'
  }

  return message || 'İşlem sırasında beklenmeyen bir hata oluştu.'
}
