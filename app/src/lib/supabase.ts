import { createClient } from '@supabase/supabase-js'

function requireEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = import.meta.env[name]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing env var ${name}. Copy .env.example to .env at the repo root and fill it in.`,
    )
  }
  return value
}

export const supabase = createClient(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
)
