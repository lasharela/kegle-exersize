import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { initAudioLifecycle } from './lib/audio-session'

// Mark audio as "playback" as early as possible so iOS won't silence cues on the
// mute switch, and re-prime + restart the keep-alive on every return to foreground.
initAudioLifecycle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
