import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { TargetLanguageSelect } from '@/pages/TargetLanguageSelect'
import { renderWithProviders } from '@/test/render'

const STORAGE_KEY = 'lc:session:v1'

function readPersistedLevels(): unknown {
  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return (JSON.parse(raw) as { proficiencyLevels?: unknown }).proficiencyLevels
}

afterEach(() => {
  window.sessionStorage.clear()
})

describe('TargetLanguageSelect', () => {
  it('stores a single JLPT selection for a Dutch native picking Japanese', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/target" element={<TargetLanguageSelect />} />
        <Route path="/mode" element={<div>mode route</div>} />
      </Routes>,
      {
        initialEntries: ['/target'],
        persisted: { nativeLanguage: 'Dutch' },
      },
    )

    expect(screen.queryByRole('button', { name: 'Nederlands' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '日本語' }))

    for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
      expect(screen.getByRole('button', { name: level })).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: 'N3' }))
    await user.click(screen.getByRole('button', { name: 'Doorgaan' }))
    expect(await screen.findByText('mode route')).toBeInTheDocument()
    expect(readPersistedLevels()).toEqual(['B1'])
  })

  it('expands JLPT N1 to both C1 and C2 on Doorgaan', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/target" element={<TargetLanguageSelect />} />
        <Route path="/mode" element={<div>mode route</div>} />
      </Routes>,
      {
        initialEntries: ['/target'],
        persisted: { nativeLanguage: 'Dutch' },
      },
    )

    await user.click(screen.getByRole('button', { name: '日本語' }))
    await user.click(screen.getByRole('button', { name: 'N1' }))
    await user.click(screen.getByRole('button', { name: 'Doorgaan' }))

    expect(await screen.findByText('mode route')).toBeInTheDocument()
    expect(readPersistedLevels()).toEqual(['C1', 'C2'])
  })

  it('lets a Japanese native toggle multiple CEFR levels for Dutch', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/target" element={<TargetLanguageSelect />} />
        <Route path="/mode" element={<div>mode route</div>} />
      </Routes>,
      {
        initialEntries: ['/target'],
        persisted: { nativeLanguage: 'Japanese' },
      },
    )

    await user.click(screen.getByRole('button', { name: 'Nederlands' }))
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
      expect(screen.getByRole('button', { name: level })).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: 'A2' }))
    await user.click(screen.getByRole('button', { name: 'B1' }))
    await user.click(screen.getByRole('button', { name: 'Doorgaan' }))

    expect(await screen.findByText('mode route')).toBeInTheDocument()
    expect(readPersistedLevels()).toEqual(['A2', 'B1'])
  })

  it('disables Doorgaan until at least one level is selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/target" element={<TargetLanguageSelect />} />
        <Route path="/mode" element={<div>mode route</div>} />
      </Routes>,
      {
        initialEntries: ['/target'],
        persisted: { nativeLanguage: 'Dutch' },
      },
    )

    expect(screen.getByRole('button', { name: 'Doorgaan' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '日本語' }))
    expect(screen.getByRole('button', { name: 'Doorgaan' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'N4' }))
    expect(screen.getByRole('button', { name: 'Doorgaan' })).toBeEnabled()
  })
})
