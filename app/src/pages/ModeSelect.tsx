import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { HostSessionForm } from '@/components/HostSessionForm'
import { useSession } from '@/contexts/SessionContext'

export function ModeSelect() {
  const { nativeLanguage, targetLanguage, proficiencyLevels, setSolo, setMultiplayer } = useSession()
  const navigate = useNavigate()
  const [hosting, setHosting] = useState(false)

  function handleSolo() {
    setSolo()
    navigate('/play')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">How do you want to play?</h1>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button size="lg" onClick={handleSolo}>
          Solo
        </Button>
        <Button
          size="lg"
          variant={hosting ? 'default' : 'outline'}
          onClick={() => setHosting(true)}
        >
          With others
        </Button>
      </div>

      {hosting && targetLanguage && nativeLanguage && proficiencyLevels.length > 0 && (
        <HostSessionForm
          targetLanguage={targetLanguage}
          hostNativeLanguage={nativeLanguage}
          hostProficiencyLevels={proficiencyLevels}
          onCreated={({ session, participant }) => {
            setMultiplayer(session.id, session.title, participant.id)
            navigate(`/session/${session.id}`)
          }}
        />
      )}
    </div>
  )
}