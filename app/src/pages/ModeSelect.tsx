import { useNavigate } from 'react-router-dom'

import { HostSessionForm } from '@/components/HostSessionForm'
import { useSession } from '@/contexts/SessionContext'

export function ModeSelect() {
  const { nativeLanguage, targetLanguage, proficiencyLevels, setMultiplayer } = useSession()
  const navigate = useNavigate()

  if (!targetLanguage || !nativeLanguage || proficiencyLevels.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">Start a session</h1>

      <HostSessionForm
        targetLanguage={targetLanguage}
        hostNativeLanguage={nativeLanguage}
        hostProficiencyLevels={proficiencyLevels}
        onCreated={({ session, participant }) => {
          setMultiplayer(session.id, session.title, participant.id)
          navigate(`/session/${session.id}`)
        }}
      />
    </div>
  )
}