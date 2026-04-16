import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { RequireNativeLanguage } from '@/components/RequireNativeLanguage'
import { RequireTargetLanguage } from '@/components/RequireTargetLanguage'
import { SessionProvider } from '@/contexts/SessionContext'
import { Home } from '@/pages/Home'
import { NativeLanguageSelect } from '@/pages/NativeLanguageSelect'
import { TargetLanguageSelect } from '@/pages/TargetLanguageSelect'

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NativeLanguageSelect />} />
          <Route
            path="/target"
            element={
              <RequireNativeLanguage>
                <TargetLanguageSelect />
              </RequireNativeLanguage>
            }
          />
          <Route
            path="/home"
            element={
              <RequireNativeLanguage>
                <RequireTargetLanguage>
                  <Home />
                </RequireTargetLanguage>
              </RequireNativeLanguage>
            }
          />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App