import { CardDisplay } from '@/components/CardDisplay'
import { Button } from '@/components/ui/button'
import { friendlyMessage } from '@/lib/errors'
import type { CardDrawnPayload, Participant } from '@/lib/sessions'

export type DealerCardView = {
  payload: CardDrawnPayload
  text: { practice: string; native: string } | null
}

type DealerViewProps = {
  participants: Participant[]
  actorParticipantId: string
  askedParticipantIds: Set<string>
  card: DealerCardView | null
  onPick: (guestId: string) => void
  onSkip: () => void
  onPass: () => void
  loading: { pick: boolean; skip: boolean; pass: boolean }
  errors: { pick: Error | null; skip: Error | null; pass: Error | null }
}

export function DealerView({
  participants,
  actorParticipantId,
  askedParticipantIds,
  card,
  onPick,
  onSkip,
  onPass,
  loading,
  errors,
}: DealerViewProps) {
  const pickables = participants.filter(
    (p) => p.id !== actorParticipantId && !askedParticipantIds.has(p.id),
  )
  const targetName = card
    ? (participants.find((p) => p.id === card.payload.target_participant_id)?.display_name ??
      'onbekend')
    : null

  return (
    <div className="min-h-screen flex flex-col items-center gap-8 px-4 py-12">
      {card ? (
        card.text && targetName && (
          <div className="flex flex-col items-center gap-4 w-full">
            <CardDisplay
              practice={card.text.practice}
              native={card.text.native}
              targetName={targetName}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loading.skip}
                onClick={onSkip}
              >
                Overslaan
              </Button>
              <Button
                size="sm"
                disabled={loading.pass}
                onClick={onPass}
              >
                Beurt doorgeven
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-md">
          <h2 className="text-lg font-medium">Kies een deelnemer</h2>
          {pickables.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nog geen deelnemers in de sessie.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pickables.map((p) => (
                <li key={p.id}>
                  <Button
                    className="w-full justify-between"
                    variant="outline"
                    disabled={loading.pick}
                    onClick={() => onPick(p.id)}
                  >
                    <span>{p.display_name}</span>
                    <span className="text-xs text-muted-foreground">{p.proficiency_levels.join(', ')}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {errors.pick && (
        <p className="text-sm text-destructive">{friendlyMessage(errors.pick)}</p>
      )}
      {errors.skip && (
        <p className="text-sm text-destructive">{friendlyMessage(errors.skip)}</p>
      )}
      {errors.pass && (
        <p className="text-sm text-destructive">{friendlyMessage(errors.pass)}</p>
      )}
    </div>
  )
}
