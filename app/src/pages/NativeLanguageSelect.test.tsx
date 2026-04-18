import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { NativeLanguageSelect } from '@/pages/NativeLanguageSelect'
import { renderWithProviders } from '@/test/render'

describe('NativeLanguageSelect', () => {
  it('navigates to /target after picking a language', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/" element={<NativeLanguageSelect />} />
        <Route path="/target" element={<div>target route</div>} />
      </Routes>,
    )

    await user.click(screen.getByRole('button', { name: 'Nederlands' }))
    expect(await screen.findByText('target route')).toBeInTheDocument()
  })
})
