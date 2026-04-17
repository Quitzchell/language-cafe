import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { RequireNativeLanguage } from '@/components/RequireNativeLanguage'
import { RequireTargetLanguage } from '@/components/RequireTargetLanguage'
import { SessionProvider } from '@/contexts/SessionContext'
import { HostWaitingRoom } from '@/pages/HostWaitingRoom'
import { JoinStub } from '@/pages/JoinStub'
import { ModeSelect } from '@/pages/ModeSelect'
import { NativeLanguageSelect } from '@/pages/NativeLanguageSelect'
import { SoloPlayStub } from '@/pages/SoloPlayStub'
import { TargetLanguageSelect } from '@/pages/TargetLanguageSelect'

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/join/:sessionId" element={<JoinStub />} />
          <Route path="/" element={<NativeLanguageSelect />} />
          <Route element={<RequireNativeLanguage />}>
            <Route path="/target" element={<TargetLanguageSelect />} />
            <Route element={<RequireTargetLanguage />}>
              <Route path="/mode" element={<ModeSelect />} />
              <Route path="/session" element={<HostWaitingRoom />} />
              <Route
                path="/session/play"
                element={<div className="min-h-screen flex items-center justify-center">Gameplay coming in LC-7</div>}
              />
              <Route path="/play" element={<SoloPlayStub />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App
