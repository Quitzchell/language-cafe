import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CardDisplay } from '@/components/CardDisplay'

describe('CardDisplay', () => {
  it('renders the romanization line when provided', () => {
    render(
      <CardDisplay
        practice="週末は何をするのが好きですか？"
        native="Wat doe je graag in het weekend?"
        targetName="Yuki"
        romanization="Shūmatsu wa nani o suru no ga suki desu ka?"
      />,
    )

    expect(
      screen.getByTestId('card-romanization'),
    ).toHaveTextContent('Shūmatsu wa nani o suru no ga suki desu ka?')
  })

  it('omits the romanization line when null', () => {
    render(
      <CardDisplay
        practice="週末は何をするのが好きですか？"
        native="Wat doe je graag in het weekend?"
        targetName="Yuki"
        romanization={null}
      />,
    )

    expect(screen.queryByTestId('card-romanization')).not.toBeInTheDocument()
  })

  it('omits the romanization line when the prop is absent', () => {
    render(
      <CardDisplay
        practice="Wat is je naam?"
        native="Wat is je naam?"
        targetName="Alice"
      />,
    )

    expect(screen.queryByTestId('card-romanization')).not.toBeInTheDocument()
  })
})
