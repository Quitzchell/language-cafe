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
  {
    realtime: {
      // Heartbeats run in a Web Worker (when available) so mobile-tab throttling
      // can't silently drop the socket while the host switches to another app.
      worker: typeof Worker !== 'undefined',
      heartbeatCallback: (status) => {
        if (status === 'disconnected') supabase.realtime.connect()
      },
    },
  },
)
