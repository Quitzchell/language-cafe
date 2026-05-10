import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:8000')
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key')

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})
