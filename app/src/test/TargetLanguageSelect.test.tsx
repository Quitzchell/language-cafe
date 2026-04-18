import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { TargetLanguageSelect } from '@/pages/TargetLanguageSelect'
import { renderWithProviders } from '@/test/render'

describe('TargetLanguageSelect', () => {
  it('offers CEFR levels when Dutch native picks Japanese target', async () => {
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
  })

  it('offers CEFR levels when Japanese native picks Dutch target', async () => {
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
  })
})
