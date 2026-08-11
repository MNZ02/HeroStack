import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App'
import './index.css'

// The page claims every study honours prefers-reduced-motion; the page that
// makes the claim had better do it too. `reducedMotion="user"` drops the
// transform and opacity tweens for those users while leaving layout intact.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
