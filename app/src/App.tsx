import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { RequireNativeLanguage } from '@/components/RequireNativeLanguage'
import { RequireTargetLanguage } from '@/components/RequireTargetLanguage'
import { SessionRoute } from '@/components/SessionRoute'
import { SessionProvider } from '@/contexts/SessionContext'
import { HostPlay } from '@/pages/HostPlay'
import { HostWaitingRoom } from '@/pages/HostWaitingRoom'
import { ModeSelect } from '@/pages/ModeSelect'
import { NativeLanguageSelect } from '@/pages/NativeLanguageSelect'
import { ParticipantJoin } from '@/pages/ParticipantJoin'
import { ParticipantPlay } from '@/pages/ParticipantPlay'
import { ParticipantWaitingRoom } from '@/pages/ParticipantWaitingRoom'
import { SoloPlayStub } from '@/pages/SoloPlayStub'
import { TargetLanguageSelect } from '@/pages/TargetLanguageSelect'

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/join/:sessionId" element={<ParticipantJoin />} />
          <Route element={<SessionRoute />}>
            <Route path="/join/:sessionId/waiting" element={<ParticipantWaitingRoom />} />
            <Route path="/join/:sessionId/play" element={<ParticipantPlay />} />
            <Route path="/session/:sessionId" element={<HostWaitingRoom />} />
            <Route path="/session/:sessionId/play" element={<HostPlay />} />
          </Route>
          <Route path="/" element={<NativeLanguageSelect />} />
          <Route element={<RequireNativeLanguage />}>
            <Route path="/target" element={<TargetLanguageSelect />} />
            <Route element={<RequireTargetLanguage />}>
              <Route path="/mode" element={<ModeSelect />} />
              <Route path="/play" element={<SoloPlayStub />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App
