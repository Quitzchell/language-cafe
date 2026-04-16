import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { RequireNativeLanguage } from '@/components/RequireNativeLanguage'
import { RequireTargetLanguage } from '@/components/RequireTargetLanguage'
import { SessionProvider } from '@/contexts/SessionContext'
import { ModeSelect } from '@/pages/ModeSelect'
import { NativeLanguageSelect } from '@/pages/NativeLanguageSelect'
import { SessionHostStub } from '@/pages/SessionHostStub'
import { SoloPlayStub } from '@/pages/SoloPlayStub'
import { TargetLanguageSelect } from '@/pages/TargetLanguageSelect'

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NativeLanguageSelect />} />
          <Route element={<RequireNativeLanguage />}>
            <Route path="/target" element={<TargetLanguageSelect />} />
            <Route element={<RequireTargetLanguage />}>
              <Route path="/mode" element={<ModeSelect />} />
              <Route path="/session" element={<SessionHostStub />} />
              <Route path="/play" element={<SoloPlayStub />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App