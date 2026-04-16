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
          <Route element={<RequireNativeLanguage />}>
            <Route path="/target" element={<TargetLanguageSelect />} />
            <Route element={<RequireTargetLanguage />}>
              <Route path="/home" element={<Home />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App