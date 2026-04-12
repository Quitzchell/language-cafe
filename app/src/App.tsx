import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { RequireNativeLanguage } from '@/components/RequireNativeLanguage'
import { SessionProvider } from '@/contexts/SessionContext'
import { Home } from '@/pages/Home'
import { NativeLanguageSelect } from '@/pages/NativeLanguageSelect'

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NativeLanguageSelect />} />
          <Route
            path="/home"
            element={
              <RequireNativeLanguage>
                <Home />
              </RequireNativeLanguage>
            }
          />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App